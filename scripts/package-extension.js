import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const extDir = path.join(rootDir, "extension");
const assetsDir = path.join(rootDir, "assets");
const zipOut = path.join(assetsDir, "valorant-store-helper.zip");

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

console.log("[PackageExtension] Building valorant-store-helper.zip...");

try {
    // Try system zip command first
    execSync(`cd "${extDir}" && zip -r "${zipOut}" . -x "*.DS_Store"`, { stdio: "pipe" });
    console.log(`[PackageExtension] Success! Generated ${zipOut} using system zip.`);
} catch (e) {
    console.log("[PackageExtension] System zip unavailable, using pure Node.js zip builder fallback...");
    buildZipPureNode(extDir, zipOut);
    console.log(`[PackageExtension] Success! Generated ${zipOut} using pure Node.js.`);
}

/**
 * Minimal standard PKZIP implementation in pure Node.js (uses node:zlib)
 */
function buildZipPureNode(srcDir, destFile) {
    const files = [];

    function collectFiles(dir, base = "") {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === ".DS_Store" || entry.name.endsWith(".zip")) continue;
            const fullPath = path.join(dir, entry.name);
            const relPath = base ? `${base}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                collectFiles(fullPath, relPath);
            } else {
                files.push({ fullPath, relPath: relPath.replace(/\\/g, "/") });
            }
        }
    }

    collectFiles(srcDir);

    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const file of files) {
        const data = fs.readFileSync(file.fullPath);
        const nameBuffer = Buffer.from(file.relPath, "utf8");
        const compressed = zlib.deflateRawSync(data);

        // CRC32
        const crc = crc32(data);

        // Local file header (30 bytes + filename)
        const localHeader = Buffer.alloc(30 + nameBuffer.length);
        localHeader.writeUInt32LE(0x04034b50, 0); // Signature
        localHeader.writeUInt16LE(20, 4);         // Version needed
        localHeader.writeUInt16LE(0, 6);          // Flags
        localHeader.writeUInt16LE(8, 8);          // Compression: Deflate
        localHeader.writeUInt16LE(0, 10);         // Mod time
        localHeader.writeUInt16LE(0, 12);         // Mod date
        localHeader.writeUInt32LE(crc, 14);       // CRC-32
        localHeader.writeUInt32LE(compressed.length, 18); // Compressed size
        localHeader.writeUInt32LE(data.length, 22);       // Uncompressed size
        localHeader.writeUInt16LE(nameBuffer.length, 26); // Filename length
        localHeader.writeUInt16LE(0, 28);                 // Extra field length
        nameBuffer.copy(localHeader, 30);

        localHeaders.push(localHeader, compressed);

        // Central directory header (46 bytes + filename)
        const centralHeader = Buffer.alloc(46 + nameBuffer.length);
        centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
        centralHeader.writeUInt16LE(20, 4);         // Version made by
        centralHeader.writeUInt16LE(20, 6);         // Version needed
        centralHeader.writeUInt16LE(0, 8);          // Flags
        centralHeader.writeUInt16LE(8, 10);         // Compression: Deflate
        centralHeader.writeUInt16LE(0, 12);         // Mod time
        centralHeader.writeUInt16LE(0, 14);         // Mod date
        centralHeader.writeUInt32LE(crc, 16);       // CRC-32
        centralHeader.writeUInt32LE(compressed.length, 20); // Compressed size
        centralHeader.writeUInt32LE(data.length, 24);       // Uncompressed size
        centralHeader.writeUInt16LE(nameBuffer.length, 28); // Filename length
        centralHeader.writeUInt16LE(0, 30);                 // Extra length
        centralHeader.writeUInt16LE(0, 32);                 // Comment length
        centralHeader.writeUInt16LE(0, 34);                 // Disk number
        centralHeader.writeUInt16LE(0, 36);                 // Internal attr
        centralHeader.writeUInt32LE(0, 38);                 // External attr
        centralHeader.writeUInt32LE(offset, 42);            // Relative offset
        nameBuffer.copy(centralHeader, 46);

        centralHeaders.push(centralHeader);

        offset += localHeader.length + compressed.length;
    }

    const centralDirOffset = offset;
    const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);            // Signature
    eocd.writeUInt16LE(0, 4);                     // Disk number
    eocd.writeUInt16LE(0, 6);                     // Central dir disk
    eocd.writeUInt16LE(files.length, 8);          // Total entries on disk
    eocd.writeUInt16LE(files.length, 10);         // Total entries
    eocd.writeUInt32LE(centralDirSize, 12);       // Central dir size
    eocd.writeUInt32LE(centralDirOffset, 16);     // Central dir offset
    eocd.writeUInt16LE(0, 20);                    // Comment length

    const finalZipBuffer = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
    fs.writeFileSync(destFile, finalZipBuffer);
}

function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
}

const crcTable = (() => {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
})();
