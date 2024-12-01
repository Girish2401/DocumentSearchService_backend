const constants = require("./constants");
const express = require("express");
const cors = require("cors");

const ESStore = require("./classes/ESStore");
const StorageService = require("./classes/StorageService");

const app = express();
const port = 3000;

const allowedDomains = ["http://localhost:4200", "https://documentsearchservice-dev-borneo.onrender.com"];

const corsOptions = {
    origin: allowedDomains,
    methods: ["GET", "PUT", "POST", "DELETE"],
    optionsSuccessStatus: 200,
};

app.use(express.json());
app.use(cors(corsOptions));

app.get('/api/search', async (req, res) => {
    const searchTerm = req.query.q;
    let ES = new ESStore(constants.CLUSTER_ENDPOINT, constants.ES_API_KEY);
    const files = await ES.getMatchedFiles(searchTerm);
    if (files.length === 0) {
        return res.status(404).json({ message: 'No files found containing the search term.' });
    }
    res.status(200).json({ results: files });
});

app.get('/api/all', async (req, res) => {
    let ES = new ESStore(constants.CLUSTER_ENDPOINT, constants.ES_API_KEY);
    const files = await ES.getAllFiles();
    if (files.length === 0) {
        return res.status(404).json({ message: 'No files found containing the search term.' });
    }
    res.status(200).json({ results: files });
});

(async () => {
    try {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
        let ES = new ESStore(constants.CLUSTER_ENDPOINT, constants.ES_API_KEY);
        await ES.checkConnection();
        await ES.createIndex();
        let store = new StorageService();
        const files = await store.fetchFiles();
        for (const file of files.entries) {
            let content = await store.getFileContent(file.path_lower, file.name);
            await ES.indexDocument(file.name, content, file.id, file.size, file.client_modified);
        }
    } catch (error) {
        console.log("error has occured", error);
    }
})();

