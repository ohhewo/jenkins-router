const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 5000;

const jenkinsInstances = {
  'localhost:8080': { url: 'http://localhost:8080', auth: { username: 'admin', password: '113b327b1cca8dc4933b3c233ea9bf64a9' } },
  'jenkins-azure.service.group': { url: 'http://jenkins-azure.service.group', auth: { username: 'admin', password: '113b327b1cca8dc4933b3c233ea9bf64a9' } }
};

// Define the job data mapping including friendly names and Jenkins URLs
const jobData = {
  'PRESTO': { friendlyName: 'Presto Build', team: 'DATA & FINANCE', jenkinsUrl: 'localhost:8080' },
  'DTS': { friendlyName: 'DTS Build', team: 'MARKET DATA', jenkinsUrl: 'localhost:8080' },
  'L01-PC-APP-GPU-BUILD': { friendlyName: 'GPU Build', team: 'APPLICATION DEVELOPMENT', jenkinsUrl: 'jenkins-azure.service.group' } // Example mapping, adjust as needed
};

// Enable CORS for the application
app.use(cors());

const fetchDataFromJenkins = async (url, auth, jobNames) => {
  try {
    const response = await axios.get(`${url}/api/json?tree=jobs[name,color,lastBuild[number,result,duration],lastSuccessfulBuild[number,timestamp,duration],lastFailedBuild[number,timestamp,duration]]`, { auth });

    return response.data.jobs
      .filter(job => jobNames.includes(job.name))
      .map(job => ({
        name: job.name,
        friendlyName: jobData[job.name] ? jobData[job.name].friendlyName : 'Unknown Job',
        team: jobData[job.name] ? jobData[job.name].team : 'Unassigned',
        color: job.color,
        lastBuild: job.lastBuild ? job.lastBuild.result : 'No builds',
        lastBuildDuration: job.lastBuild ? job.lastBuild.duration : 'N/A',
        lastSuccessfulBuild: job.lastSuccessfulBuild ? new Date(job.lastSuccessfulBuild.timestamp).toLocaleString() : 'N/A',
        lastFailedBuild: job.lastFailedBuild ? new Date(job.lastFailedBuild.timestamp).toLocaleString() : 'N/A',
      }));
  } catch (error) {
    console.error(`Error fetching data from Jenkins API at ${url}:`, error);
    throw error;
  }
};

// Route to fetch Jenkins job data
app.get('/jobs', async (req, res) => {
  const jobNames = req.query.jobs ? req.query.jobs.split(',') : [];
  if (jobNames.length === 0) {
    return res.status(400).send('No job names specified');
  }

  try {
    const jobData = await Promise.all(Object.values(jenkinsInstances).map(instance =>
      fetchDataFromJenkins(instance.url, instance.auth, jobNames)
    ));

    const combinedData = jobData.flat();
    res.json(combinedData);
  } catch (error) {
    res.status(500).send('Error fetching data from Jenkins API');
  }
});

const fetchHistoricDataFromJenkins = async (url, auth, jobNames) => {
  try {
    const response = await axios.get(`${url}/api/json?tree=jobs[name,builds[number,timestamp,result]]`, { auth });

    const builds = [];
    response.data.jobs
      .filter(job => jobNames.includes(job.name))
      .forEach(job => {
        job.builds.forEach(build => {
          builds.push({
            name: job.name,
            friendlyName: jobData[job.name] ? jobData[job.name].friendlyName : 'Unknown Job',
            team: jobData[job.name] ? jobData[job.name].team : 'Unassigned',
            timestamp: build.timestamp,
            result: build.result
          });
        });
      });

    return builds;
  } catch (error) {
    console.error(`Error fetching historic job data from Jenkins API at ${url}:`, error);
    throw error;
  }
};

// Route to fetch historic Jenkins job data
app.get('/historic-jobs', async (req, res) => {
  const jobNames = req.query.jobs ? req.query.jobs.split(',') : [];
  if (jobNames.length === 0) {
    return res.status(400).send('No job names specified');
  }

  const jobsByUrl = jobNames.reduce((acc, jobName) => {
    const jenkinsUrl = jobData[jobName]?.jenkinsUrl;
    if (jenkinsUrl) {
      if (!acc[jenkinsUrl]) {
        acc[jenkinsUrl] = [];
      }
      acc[jenkinsUrl].push(jobName);
    }
    return acc;
  }, {});

  try {
    const historicData = await Promise.all(Object.entries(jobsByUrl).map(([urlKey, jobs]) =>
      fetchHistoricDataFromJenkins(jenkinsInstances[urlKey].url, jenkinsInstances[urlKey].auth, jobs)
    ));

    const combinedData = historicData.flat();
    res.json(combinedData);
  } catch (error) {
    res.status(500).send('Error fetching historic job data from Jenkins API');
  }
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
