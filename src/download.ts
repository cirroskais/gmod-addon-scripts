import { readdir, mkdir, cp, writeFile, exists } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import GMAD from "./lib/gmad";
import SteamCMD from "./lib/steamcmd";
import { glob } from "glob";
import LZMA from "./lib/lzma";

try {
    await readdir(Bun.env.GARRYSMOD);
} catch (err) {
    await mkdir(Bun.env.GARRYSMOD);
}

const cmd = new SteamCMD();
await cmd.init(Bun.env.STEAMCMD, Bun.env.ADDON_STORAGE);
const gmad = new GMAD(); // bacon?
await gmad.init(Bun.env.GMAD);
const lzma = new LZMA();
await lzma.init(Bun.env.GMOD_LZMA);

const addons = [];

let folders = [];
for await (const id of addons) {
    console.log("Downloading:", id);
    let { path } = await cmd.workshopDownloadItem(4000, id).catch((e) => {
        return { path: "" };
    });
    if (!path.length) continue;

    if (path.includes(".bin") && !(await exists(path.replace(".bin", ".gma")))) {
        path = await lzma.extract(path);
    }

    folders.push({ id, addon: await gmad.extract(path.replace(".bin", ".gma")) });
}

for await (const { id, addon } of folders) {
    const files = await glob("**/*.*", { cwd: addon });

    try {
        await readdir(`${Bun.env.GARRYSMOD}/addonmap`);
    } catch (err) {
        await mkdir(`${Bun.env.GARRYSMOD}/addonmap`);
    }
    await writeFile(`${Bun.env.GARRYSMOD}/addonmap/${id}.txt`, files.join("\n"));

    for await (const file of files) {
        if (!(await exists(`${Bun.env.GARRYSMOD}/${file}`))) {
            console.log("Transferring:", file);
            await cp(`${addon}/${file}`, `${Bun.env.GARRYSMOD}/${file}`, { recursive: true });
        } else {
            console.log("Exists:", file);
        }
    }

    process.exit();
}
