// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 5000;

app.use(cors());

app.get('/jobs', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8080/api/json?tree=jobs[name,color,lastBuild[number,result,duration],lastSuccessfulBuild[number,timestamp,duration],lastFailedBuild[number,timestamp,duration]]', {
      auth: {
        username: 'admin',
        password: '113b327b1cca8dc4933b3c233ea9bf64a9'
      }
    });

    console.log('Jenkins API response:', response.data.jobs);

    const jobs = response.data.jobs.map(job => ({
      name: job.name,
      color: job.color,
      lastBuild: job.lastBuild ? job.lastBuild.result : 'No builds',
      lastBuildDuration: job.lastBuild ? job.lastBuild.duration : 'N/A',
      lastSuccessfulBuild: job.lastSuccessfulBuild ? new Date(job.lastSuccessfulBuild.timestamp).toLocaleString() : 'N/A',
      lastFailedBuild: job.lastFailedBuild ? new Date(job.lastFailedBuild.timestamp).toLocaleString() : 'N/A',
    }));
    
    console.log('Processed job data:', jobs);

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching data from Jenkins API:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error('Request data:', error.request);
      res.status(500).send('No response received from Jenkins API');
    } else {
      console.error('Error message:', error.message);
      res.status(500).send(error.message);
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
