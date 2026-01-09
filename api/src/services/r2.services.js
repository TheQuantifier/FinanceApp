// src/services/r2.service.js
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

const R2_BUCKET = required("R2_BUCKET");
const R2_ENDPOINT = required("R2_ENDPOINT"); // e.g. https://<accountid>.r2.cloudflarestorage.com
const R2_ACCESS_KEY_ID = required("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = required("R2_SECRET_ACCESS_KEY");

export const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // important for R2 compatibility
});

export function makeObjectKey({ userId, fileId, filename }) {
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
  const rand = crypto.randomBytes(8).toString("hex");
  return `users/${userId}/receipts/${fileId}/${rand}.${ext}`;
}

export async function presignPut({ key, contentType, expiresIn = 60 }) {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(r2, cmd, { expiresIn });
  return url;
}

export async function presignGet({ key, expiresIn = 60 }) {
  const cmd = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(r2, cmd, { expiresIn });
  return url;
}

export async function headObject({ key }) {
  const cmd = new HeadObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return r2.send(cmd);
}

export async function deleteObject({ key }) {
  const cmd = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return r2.send(cmd);
}
