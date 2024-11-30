const { Client } = require('@elastic/elasticsearch');
const constants = require('../constants');


class ESStore {
    constructor(clusterEndpoint, ESaccessToken) {
        try {
            // Validate that the required variables are defined
            if (!clusterEndpoint) {
                throw new Error("Elasticsearch cluster endpoint is undefined. Ensure it is set correctly.");
            }
            if (!ESaccessToken) {
                throw new Error("Elasticsearch access token (API_KEY) is undefined. Ensure you have provided a valid API key.");
            }

            // Initialize a new Elasticsearch client instance
            this.client = new Client({
                // Specify the endpoint of the Elasticsearch cluster (Elastic Cloud or on-premises)
                node: clusterEndpoint,

                // Authentication settings
                auth: {
                    // API key for authenticating requests to Elasticsearch
                    // Replace 'ESaccessToken' with your actual API key generated from the Elastic Cloud Console or your Elasticsearch cluster
                    apiKey: ESaccessToken,
                },

                // Enable detailed logging for troubleshooting and debugging
                // Options include: 'error', 'warning', 'info', 'debug', and 'trace'
                // 'trace' provides the most detailed logging information, but should be used cautiously in production.
                log: 'trace',
            });

            console.log("Elasticsearch client initialized successfully.");

        } catch (error) {
            // Catch and log any errors during initialization
            console.error("Failed to initialize Elasticsearch client:", error.message);
        }
    }

    // async createConnection(clusterEndpoint, ESaccessToken) {
    //     try {
    //         // Validate that the required variables are defined
    //         if (!clusterEndpoint) {
    //             throw new Error("Elasticsearch cluster endpoint is undefined. Ensure it is set correctly.");
    //         }
    //         if (!ESaccessToken) {
    //             throw new Error("Elasticsearch access token (API_KEY) is undefined. Ensure you have provided a valid API key.");
    //         }

    //         // Initialize a new Elasticsearch client instance
    //         this.client = new Client({
    //             // Specify the endpoint of the Elasticsearch cluster (Elastic Cloud or on-premises)
    //             node: clusterEndpoint,

    //             // Authentication settings
    //             auth: {
    //                 // API key for authenticating requests to Elasticsearch
    //                 // Replace 'ESaccessToken' with your actual API key generated from the Elastic Cloud Console or your Elasticsearch cluster
    //                 apiKey: ESaccessToken,
    //             },

    //             // Enable detailed logging for troubleshooting and debugging
    //             // Options include: 'error', 'warning', 'info', 'debug', and 'trace'
    //             // 'trace' provides the most detailed logging information, but should be used cautiously in production.
    //             log: 'trace',
    //         });

    //         console.log("Elasticsearch client initialized successfully.");

    //     } catch (error) {
    //         // Catch and log any errors during initialization
    //         console.error("Failed to initialize Elasticsearch client:", error.message);
    //     }
    // }

    async checkConnection() {
        try {
            // Use the ping method to check if the Elasticsearch cluster is reachable
            const response = await this.client.ping();
            console.log('Elasticsearch is up and running!');
            console.log('Cluster Info:', response);
        } catch (error) {
            console.error('Error connecting to Elasticsearch:', error);
        }
    }

    // Function to check if an Elasticsearch index exists and create it if it doesn't.
    async createIndex() {
        const exists = await this.client.indices.exists({ index: constants.INDEX_NAME });

        if (!exists) {
            await this.client.indices.create({
                index: 'text-files-index', // The index name you want to create
                body: {
                    mappings: {
                        properties: {
                            filename: { type: 'text' },
                            content: { type: 'keyword' },
                            dropboxFileId: { type: "text" }
                        },
                    },
                },
            });
            console.log('Index created successfully');
        } else {
            console.log('Index already exists');
        }
    }

    /**
    * Indexes a document into Elasticsearch.
    * 
    * @param {string} filename - The name of the file.
    * @param {string} content - The content of the file.
    * @param {string} dropboxFileId - The unique identifier for the file in Dropbox.
    */
    // Function to index a document in Elasticsearch
    async indexDocument(filename, content, dropboxFileId) {
        try {
            // Validate input parameters
            if (!filename || !content || !dropboxFileId) {
                throw new Error('Missing required parameters: filename, content, or dropboxFileId.');
            }
            const response = await this.client.index({
                index: constants.INDEX_NAME,
                id: dropboxFileId,
                document: {
                    filename,
                    content,
                    dropboxFileId
                }
            });
            console.log(`Document indexed successfully: ${response._id}`);
        } catch (error) {
            console.error('Error indexing document:', error);
        }
    };

    /**
     * Searches for files in Elasticsearch based on a search term.
     * 
     * @param {string} searchTerm - The term to search for in the content field. If not provided, fetches all documents.
     * @returns {Array|Object} - An array of matching files with URLs or an error response.
     */
    async getMatchedFiles(searchTerm) {
        console.log(searchTerm);
        // if (!searchTerm) {
        //     return res.status(400).json({ error: 'Search term is required.' });
        // }

        try {
            const query = {
                query: {
                    wildcard: {
                        content: `*${searchTerm}*`  // Matches any content containing the searchTerm
                    }
                },
                _source: ['filename', 'dropboxFileId']  // Only return the 'filename' and 'dropboxFileId' fields
            };


            // Elasticsearch query to search for the term in the content field
            const response = await this.client.search({
                index: 'text-files-index', // Your Elasticsearch index name
                body: query
            });

            // Extract the relevant information (filename and document URL)
            const hits = response.hits.hits.map(hit => {
                return {
                    filename: hit._source.filename,
                    url: `https://www.dropbox.com/s/${hit._source.dropboxFileId}/${hit._source.filename}?dl=0`, // Replace with your file server URL
                };
            });

            // Return the list of files and URLs
            return hits;
        } catch (error) {
            console.error('Error searching Elasticsearch:', error);
            // res.status(500).json({ error: 'Failed to search documents' });
        }
    }
}

module.exports = ESStore;