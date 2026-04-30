import crypto from "crypto"; // Node.js built-in module for cryptographic functions
import "dotenv/config"
const algorithm = "aes-256-cbc"; // Define the encryption algorithm to use (AES-256 in CBC mode)
const key = crypto //derive a key from the ENCRYPTION_KEY environment variable using SHA-256 hashing to ensure it is the correct length for the AES-256 algorithm. This key will be used for both encryption and decryption operations in the encrypt and decrypt functions defined below.
    .createHash("sha256") // Create a hash instance using the SHA-256 algorithm
    .update(process.env.ENCRYPTION_KEY) // Update the hash instance with the ENCRYPTION_KEY from the environment variables
    .digest();  // Finalize the hash and return the derived key as a buffer

    export function encrypt(text) {
        const iv = crypto.randomBytes(16); // Generate a random initialization vector (IV) for encryption
        const cipher = crypto.createCipheriv(algorithm, key, iv); // Create a cipher instance using the specified algorithm, key, and IV
        let encrypted = cipher.update(text, "utf8", "hex"); // Encrypt the input text and specify the input and output encoding formats
        encrypted += cipher.final("hex"); // Finalize the encryption process and append any remaining encrypted data
        return iv.toString("hex") + ":" + encrypted; // Return the IV and the encrypted text concatenated together, separated by a colon. The IV is needed for decryption later.
    }
    export function decrypt(encryptedText) {
        const [ivHex, encrypted] = encryptedText.split(":"); // Split the input into the IV and the encrypted text using the colon as a delimiter
        const iv = Buffer.from(ivHex, "hex"); // Convert the IV from hexadecimal string back to a buffer
        const decipher = crypto.createDecipheriv(algorithm, key, iv); // Create a decipher instance using the specified algorithm, key, and IV
        let decrypted = decipher.update(encrypted, "hex", "utf8"); // Decrypt the encrypted text and specify the input and output encoding formats
        decrypted += decipher.final("utf8"); // Finalize the decryption process and append any remaining decrypted data
        return decrypted; // Return the decrypted text as a UTF-8 string
    }