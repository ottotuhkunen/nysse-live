import express from 'express';
import cors from 'cors';
import { GraphQLClient, gql } from 'graphql-request';

const app = express();

app.use(cors());

const DIGITRANSIT_API_URL = 'https://api.digitransit.fi/routing/v1/routers/waltti/index/graphql';
const API_KEY = 'afec905605474a1c9e8bf3f56c961af6';

app.get('/api/stops/:stopId', async (req, res) => {
    const stopId = `tampere:${req.params.stopId}`;
    const client = new GraphQLClient(DIGITRANSIT_API_URL, {
        headers: {
            'Content-Type': 'application/json',
            'digitransit-subscription-key': API_KEY
        }
    });

    const query = gql`
    {
        stop(id: "${stopId}") {
            name
            stoptimesWithoutPatterns {
                scheduledArrival
                realtimeArrival
                arrivalDelay
                scheduledDeparture
                realtimeDeparture
                departureDelay
                realtime
                realtimeState
                serviceDay
                headsign
                trip {
                    route {
                      shortName
                    }
                }
            }
        }
    } 
    `;

    try {
        const { stop } = await client.request(query);

        res.json(stop);
    } catch (error) {
        console.error('Error fetching timetable data:', error.response || error.message || error);
        res.status(500).json({ error: 'Error fetching timetable data', details: error.response || error.message || error });
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Proxy server is running on http://localhost:${PORT}`);
});
