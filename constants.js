require('dotenv').config();

module.exports = {
    ACCESS_TOKEN: process.env.DROPBOX_TOKEN,
    CLUSTER_ENDPOINT: process.env.CLUSTER_ENDPOINT,
    ES_API_KEY: process.env.ES_API_KEY,
    INDEX_NAME: 'text-files-index'
}


