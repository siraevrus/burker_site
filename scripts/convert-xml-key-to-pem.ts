#!/usr/bin/env npx tsx
/**
 * Конвертация rsa_2048_private_key.xml (RSAKeyValue) в PEM.
 * Orange Data выдаёт ключ в XML-формате.
 */

import forge from "node-forge";
import fs from "fs";
import path from "path";

function parseXmlRsaKey(xml: string) {
  const extract = (tag: string): string => {
    const re = new RegExp(`<${tag}>([^<]+)</${tag}>`);
    const m = xml.match(re);
    if (!m) throw new Error(`Missing ${tag}`);
    return m[1].replace(/\s/g, "");
  };
  return {
    n: extract("Modulus"),
    e: extract("Exponent"),
    d: extract("D"),
    p: extract("P"),
    q: extract("Q"),
    dP: extract("DP"),
    dQ: extract("DQ"),
    qInv: extract("InverseQ"),
  };
}

function toAsn1Integer(b64: string): Buffer {
  let bytes = Buffer.from(forge.util.decode64(b64), "binary");
  if (bytes.length > 0 && (bytes[0]! & 0x80)) {
    bytes = Buffer.concat([Buffer.from([0]), bytes]);
  }
  return bytes;
}

function xmlToPem(xmlPath: string): string {
  const xml = fs.readFileSync(xmlPath, "utf8");
  const keys = parseXmlRsaKey(xml);

  const asn1 = forge.asn1;
  const seq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, "\x00"),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.n).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.e).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.d).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.p).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.q).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.dP).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.dQ).toString("binary")),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false, toAsn1Integer(keys.qInv).toString("binary")),
  ]);
  const privateKey = forge.pki.privateKeyFromAsn1(seq);
  return forge.pki.privateKeyToPem(privateKey);
}

const xmlPath = path.join(process.cwd(), "orange_prod", "rsa_2048_private_key.xml");
const outPath = path.join(process.cwd(), "orange_prod", "rsa_private.pem");

if (!fs.existsSync(xmlPath)) {
  console.error("Файл не найден:", xmlPath);
  console.error("Положите rsa_2048_private_key.xml в orange_prod/");
  process.exit(1);
}

const pem = xmlToPem(xmlPath);
fs.writeFileSync(outPath, pem);
console.log("Сохранено:", outPath);
console.log("Запустите: npx tsx scripts/check-orangedata.ts");
