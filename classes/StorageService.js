const constants = require("../constants");
const https = require('https');
const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

class StorageService {
    constructor() { }
    /**
     * Fetches the list of files and folders from the Dropbox API using `fetch`.
     * 
     * @returns {Promise<Object>} - A promise that resolves to the list of files and folders or rejects with an error message.
     */
    async fetchFiles() {
        const url = 'https://api.dropboxapi.com/2/files/list_folder';

        const requestBody = {
            path: '', // Root folder path.change this if u need to fetch file from some other path
            recursive: false, // Set to true if you want to fetch files recursively.
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${constants.ACCESS_TOKEN}`, // Dropbox API access token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Dropbox API error: ${response.status} - ${errorText}`);
            }

            // Parse the JSON response
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error fetching files from Dropbox:', error.message);
            throw error;
        }
    }

    /**
     * Downloads the content of a file from Dropbox using its path.
     * 
     * @param {string} path - The Dropbox path of the file to download.
     * @param {string} filename - The name of the file (optional for debugging/logging purposes).
     * @returns {Promise<string>} - A promise that resolves to the file's content as text.
     */
    async getFileContent(path, filename) {
        const downloadUrl = 'https://content.dropboxapi.com/2/files/download';

        try {
            // Perform the API request
            const response = await fetch(downloadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${constants.ACCESS_TOKEN}`, // Dropbox API access token
                    'Dropbox-API-Arg': JSON.stringify({ path }), // Specify the file path
                },
            });

            // Handle HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to download file '${filename || path}' from Dropbox. Status: ${response.status} - ${errorText}`
                );
            }

            // Get the file data as a buffer
            const fileBuffer = await response.buffer();

            // Determine file type based on file extension or content
            const fileExtension = filename ? filename.split('.').pop().toLowerCase() : '';

            // Parse and return the file content as text
            // const fileContent = await response.text();

            // Handle different file types
            switch (fileExtension) {
                case 'txt':
                    // Handle .txt files (simple text)
                    const textContent = fileBuffer.toString('utf8');
                    return textContent;

                case 'pdf':
                    // Handle .pdf files (parse PDF)
                    const pdfData = await pdfParse(fileBuffer);
                    return pdfData.text; // Return extracted text from PDF

                case 'docx':
                    // Handle .docx files (parse DOCX)
                    const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
                    return docxData.value; // Return extracted text from DOCX

                default:
                    throw new Error(`Unsupported file type: ${fileExtension}`);
            }
        } catch (error) {
            // Log error details for debugging
            console.error(
                `Error fetching file content for '${filename || path}':`,
                error.message
            );
            throw error; // Re-throw the error for upstream handling
        }
    }

}

module.exports = StorageService;