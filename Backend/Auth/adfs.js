import * as client from "openid-client";
import dotenv from "dotenv";

dotenv.config();

let config;

export async function initADFS() {
  if (config) return config;

  config = await client.discovery(
    new URL(process.env.ADFS_ISSUER),
    process.env.ADFS_CLIENT_ID,
    process.env.ADFS_CLIENT_SECRET
  );

  return config;
}

export async function getADFSClient() {
  if (!config) {
    await initADFS();
  }
  return config;
}

export function generateAuthState() {
  return {
    state: client.randomState(),
    nonce: client.randomNonce(),
    codeVerifier: client.randomPKCECodeVerifier()
  };
}

export async function generateCodeChallenge(codeVerifier) {
  return client.calculatePKCECodeChallenge(codeVerifier);
}