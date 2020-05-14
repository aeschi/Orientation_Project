const express = require('express');

const port = process.env.PORT || 3000;
const server = express()
    .use(express.static('public'))
    .listen(port, () => console.log(`Listening on ${port}`));
