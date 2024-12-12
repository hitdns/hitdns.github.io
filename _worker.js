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
    let path = url.pathname.slice(0);
    let paths = path.split("/");
    let search = { __proto__: null };
    for (let key of url.searchParams.keys()) {
        let lkey = key.toLowerCase();
        if (search[lkey] !== undefined) {
	    continue;
	}
	search[lkey] = url.searchParams.get(key);
    }

    let arch = search.arch?.toLowerCase();
    let os = search.os?.toLowerCase();

    if (!os) {
	os = paths[1]?.toLowerCase();
    }
    if (!arch) {
        arch = paths[2]?.toLowerCase();
    }

    let build = url.searchParams.get("build");

    let binaries;
    if (build && build.length > 0 && build.toLowerCase() != 'latest') {
        binaries = await listBinaries(build);
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

    let linux = ["linux", "lin", "l"];
    let android = ["android", "and", "a"];
    let netbsd = ["netbsd", "nbsd", "n"];
    let freebsd = ["freebsd", "fbsd", "f"];
    let windows = ["windows", "win", "w"];
    let macos = ["mac", "macos", "osx", "darwin", "m"];

    let openwrt = ["openwrt", "wrt", "router", "mips", "r"];
    let amd64 = ["amd64", "x64", "x86-64", "x86_64", "64"];
    let i686 = ["x86", "i686", "32", "86"];
    let aarch64 = ["aarch64", "arm64", "a64"];
    let armv7 = ["armv7", "arm", "arm32", "a32"];

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
  HitDNS - Download links of CI builds: <br/>
`;
    let listof = true;
    for (let it of binaries) {
        if (listof) {
            listof = false;
            html += `<span style="font-size: 25px;"> (List of ${it.path.split("/")[1]}) </span> <br/>\n`;
            html += '<table><tbody><tr><td>File</td><td>Size</td></tr>\n';
        }

	if (linux.indexOf(os) != -1 || linux.indexOf(arch) != -1) {
	    if (it.name.indexOf("linux") == -1) {
	        continue;
	    }
	} else if (android.indexOf(os) != -1 || android.indexOf(arch) != -1) {
	    if (it.name.indexOf("android") == -1) {
	        continue;
	    }
	} else if (netbsd.indexOf(os) != -1 || netbsd.indexOf(arch) != -1) {
	    if (it.name.indexOf("netbsd") == -1) {
	        continue;
	    }
	} else if (freebsd.indexOf(os) != -1 || freebsd.indexOf(arch) != -1) {
	    if (it.name.indexOf("freebsd") == -1) {
	        continue;
	    }
	} else if (windows.indexOf(os) != -1 || windows.indexOf(arch) != -1) {
	    if (it.name.indexOf("windows") == -1) {
	        continue;
	    }
	} else if (macos.indexOf(os) != -1 || macos.indexOf(arch) != -1) {
	    if (it.name.indexOf("mac") == -1) {
	        continue;
	    }
	}

        if (openwrt.indexOf(arch) != -1 || openwrt.indexOf(os) != -1) {
	    if (it.name.indexOf("mips") == -1) {
	        continue;
	    }
	} else if (amd64.indexOf(arch) != -1 || amd64.indexOf(os) != -1) {
	    if (it.name.indexOf("amd64") == -1) {
	        continue;
	    }
	} else if (i686.indexOf(arch) != -1 || i686.indexOf(os) != -1) {
	    if (it.name.indexOf("i686") == -1) {
	        continue;
	    }
	} else if (aarch64.indexOf(arch) != -1 || aarch64.indexOf(os) != -1) {
	    if (it.name.indexOf("aarch64") == -1) {
	        continue;
	    }
	} else if (armv7.indexOf(arch) != -1 || armv7.indexOf(os) != -1) {
	    if (it.name.indexOf("armv7") == -1) {
	        continue;
	    }
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
            return new Response(`Error: ${err}\n\n\n${err.stack}\n\n${g.json_pre}`, { status: 302, headers: { 'Location': '/' } });
        }
    }
};

