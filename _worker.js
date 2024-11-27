const REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
};

async function getLatest() {
    let res = await fetch("https://api.github.com/repos/delta4chat/hitdns/contents/bin/latest?ref=bin", { headers: REQUEST_HEADERS });
    let latest = JSON.parse(g.json_pre = await res.text());
    if (latest.type != "symlink") {
        throw new Error("ref: hitdns/bin -> path: bin/latest is not a symlink");
    }
    return latest.target;
}

async function listBuilds() {
    let res = await fetch("https://api.github.com/repos/delta4chat/hitdns/contents/bin?ref=bin", { headers: REQUEST_HEADERS });
    let list = JSON.parse(g.json_pre = await res.text());
    let builds = [];
    for (let it of list) {
        if (it.type != "dir") {
            continue;
        }
        builds.push(it);
    }
    return builds;
}

async function listBinaries(dirname) {
    let res = await fetch(`https://api.github.com/repos/delta4chat/hitdns/contents/bin/${dirname}?ref=bin`, { headers: REQUEST_HEADERS });
    return JSON.parse(g.json_pre = await res.text());
}

async function listLatest() {
    let latest = await getLatest();
    return await listBinaries(latest);
}

let g = {};

function fileSize(bytes) {
    const K = 1024;
    const M = 1024 * K;
    const G = 1024 * M;
    const T = 1024 * G;

    if (bytes < K) {
        return (bytes == 1 ? `${bytes} byte` : `${bytes} bytes`);
    }
    if (bytes < M) {
        return `${(bytes / K).toFixed(3)} KiB`;
    }
    if (bytes < G) {
        return `${(bytes / M).toFixed(3)} MiB`;
    }
    if (bytes < T) {
        return `${(bytes / G).toFixed(3)} GiB`;
    }
    return `${(bytes / T).toFixed(3)} TiB`;
}

async function onFetch(request, env, ctx) {
    let url = new URL(request.url);
    let build = url.searchParams.get("build");

    let binaries;
    if (build && build.length > 0 && build.toLowerCase() != 'latest') {
        try {
            binaries = await listBinaries(build);
        } catch (err) {
            // not found
            binaries = await listLatest();
        }
    } else {
        binaries = await listLatest();
    }

    let html = `<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>HitDNS Latest CI Artifacts Download</title>
    <style type="text/css">
      table {
        border-collapse: collapse;
        border-spacing: 0px;
      }

      table, th, td {
        padding: 5px;
        border: 1px solid black;
      }
    </style>
  </head>
  <body>
  <h1 id="binariesTitle">HitDNS Latest CI Artifacts Download</h1>
  <div>
    <form method="GET" action="">
      select build by date/commit:
      <select id="buildSelect" name="build">
        <option value="latest">Latest</option>
`;
    let builds = await listBuilds();
    for (let it of builds) {
        let selected = '';
        if (it.name == build) {
            selected = ' selected="selected"';
        }
        html += `<option value="${it.name}"${selected}>${it.name}</option>\n`
    }
    html += `
      </select>
      <input type="submit"/>
    </form>
  </div>
  <hr/>
  <div style="font-size: 50px">
    <h1>HitDNS - Download links of CI builds:</h1>
`;
    let listof = true;
    for (let it of binaries) {
        if (listof) {
            listof = false;
            html += `<span style="font-size: 25px;"> (List of ${it.path.split("/")[1]}) </span> <br/><br/>\n`;
            html += '<table><tbody><tr><td>File</td><td>Size</td></tr>\n';
        }
        html += `<tr>  <td><a href="${it.download_url}">${it.name}</a></td> <td>${fileSize(it.size)}</td>  </tr>\n`;
    }
    html += '<tr><td>File</td><td>Size</td></tr></tbody></table> </div> </body></html>';

    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export default {
    async fetch(request, env, ctx) {
        try {
            return await onFetch(request, env, ctx);
        } catch (err) {
            return new Response(`${Date.now()}\n${g.json_pre}\n${err}\n\n\n${err.stack}`, { status: 500 });
        }
    }
};

