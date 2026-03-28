function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

export async function buildUploadPdfFingerprint(file: File): Promise<string> {
  const headerSlice = file.slice(0, 2048);
  const footerSlice = file.size > 2048 ? file.slice(Math.max(0, file.size - 2048)) : file.slice(0, 0);

  const [headerBuffer, footerBuffer] = await Promise.all([headerSlice.arrayBuffer(), footerSlice.arrayBuffer()]);

  const metadataChunk = new TextEncoder().encode(
    `${file.name}|${file.size}|${file.lastModified}|${file.type}`
  );

  const digestInput = concatChunks([
    metadataChunk,
    new Uint8Array(headerBuffer),
    new Uint8Array(footerBuffer)
  ]);

  if (typeof crypto === "undefined" || typeof crypto.subtle?.digest !== "function") {
    return `${file.size}-${file.lastModified}-${file.name}`;
  }

  const digestPayload = new Uint8Array(digestInput.byteLength);
  digestPayload.set(digestInput);
  const digest = await crypto.subtle.digest("SHA-256", digestPayload);
  return bytesToHex(new Uint8Array(digest)).slice(0, 32);
}
