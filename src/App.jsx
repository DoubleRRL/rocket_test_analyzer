import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './styles/tailwind.css';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

function App() {
  const [data, setData] = useState({ allLabels: [], allThrust: [], allPressure: [], allTemperature: [], allVibration: [], allHeatShieldTemp: [], launchData: {}, launchNames: {} });
  const [selectedLaunch, setSelectedLaunch] = useState(null);
  const [compareLaunch, setCompareLaunch] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('thrust');
  const [compareMetric, setCompareMetric] = useState('thrust');
  const [zoomedMetric, setZoomedMetric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRefs = useRef([]); // Ref for each chart instance

  useEffect(() => {
    axios.get('/data/rocket_logs.csv')
      .then(response => {
        const rows = response.data.split('\n').slice(1).filter(row => row);
        const allLabels = [];
        const allThrust = [];
        const allPressure = [];
        const allTemperature = [];
        const allVibration = [];
        const allHeatShieldTemp = [];
        const launchData = {};

        rows.forEach(row => {
          const [launch_id, timestamp, thrust_val, pressure_val, temp_val, vibration_val, stress, heat_shield, ambient, wind, stage, block] = row.split(',');
          if (!launchData[launch_id]) launchData[launch_id] = { labels: [], thrust: [], pressure: [], temperature: [], vibration: [], heat_shield_temp: [] };
          launchData[launch_id].labels.push(`${timestamp.slice(-8)} (${stage})`);
          launchData[launch_id].thrust.push(parseFloat(thrust_val) || 0);
          launchData[launch_id].pressure.push(parseFloat(pressure_val) || 0);
          launchData[launch_id].temperature.push(parseFloat(temp_val) || 0);
          launchData[launch_id].vibration.push(parseFloat(vibration_val) || 0);
          launchData[launch_id].heat_shield_temp.push(parseFloat(heat_shield) || 0);

          allLabels.push(`${launch_id} - ${timestamp.slice(-8)} (${stage})`);
          allThrust.push(parseFloat(thrust_val) || 0);
          allPressure.push(parseFloat(pressure_val) || 0);
          allTemperature.push(parseFloat(temp_val) || 0);
          allVibration.push(parseFloat(vibration_val) || 0);
          allHeatShieldTemp.push(parseFloat(heat_shield) || 0);
        });

        const launchNames = {
          "S001": "First Wild Ride", "S002": "Orbit Firestorm", "S003": "Orbit Breakthrough",
          "S004": "Booster Catch Win", "S005": "Raptor Burn Success", "S006": "Stable Orbit Run",
          "S007": "Avionics Glitch", "S008": "Engine Fail Frenzy", "S009": "Block 2 Glory"
        };
        setData({ allLabels, allThrust, allPressure, allTemperature, allVibration, allHeatShieldTemp, launchData, launchNames });
        setSelectedLaunch("S009");
        setLoading(false);
      })
      .catch(err => {
        console.error('CSV fetch error:', err);
        setError('Failed to load rocket logs. Check CSV path.');
        setLoading(false);
      });
  }, []);

  const createChartData = (label1, dataKey1, label2, dataKey2, color1, color2, labels) => ({
    labels,
    datasets: [
      {
        label: label1,
        data: dataKey1,
        borderColor: color1,
        backgroundColor: `${color1}33`,
        fill: false,
        tension: 0.1,
        pointRadius: 1,
      },
      ...(dataKey2.length > 0 ? [{
        label: label2,
        data: dataKey2,
        borderColor: color2,
        backgroundColor: `${color2}33`,
        fill: false,
        tension: 0.1,
        pointRadius: 1,
      }] : []),
    ],
  });

  const getSuggestedMax = (metric1, metric2) => {
    const metrics = [metric1, metric2];
    if (metrics.includes('thrust')) return 20000;
    if (metrics.includes('pressure')) return 200;
    if (metrics.includes('temperature')) return 1000;
    if (metrics.includes('vibration')) return 15;
    return 2000; // heat_shield_temp
  };

  const chartOptions = {
    responsive: true,
    scales: { y: { beginAtZero: true } },
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    elements: { point: { radius: 0 } },
  };

  const handleChartClick = (index) => {
    if (!zoomedMetric) {
      const metrics = ['thrust', 'pressure', 'temperature', 'vibration', 'heat_shield_temp'];
      setZoomedMetric(metrics[index]); // Set zoomed metric based on chart index
    }
  };

  const currentData = selectedLaunch ? data.launchData[selectedLaunch] : { labels: data.allLabels, thrust: data.allThrust, pressure: data.allPressure, temperature: data.allTemperature, vibration: data.allVibration, heat_shield_temp: data.allHeatShieldTemp };
  const compareData = compareLaunch ? data.launchData[compareLaunch] : null;

  if (loading) return <div className="text-2xl text-blue-600">Loading Starship Data...</div>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-blue-600 mb-6">Starship Test Analyzer</h1>
      <div className="flex flex-col gap-4 mb-6 w-full max-w-2xl">
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold">Main Launch</label>
          <select
            className="p-2 border rounded text-lg bg-white"
            value={selectedLaunch || ""}
            onChange={(e) => setSelectedLaunch(e.target.value)}
          >
            <option value="" disabled>Select Main Launch</option>
            {data.launchNames && Object.entries(data.launchNames).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            className="p-2 border rounded text-lg bg-white"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
          >
            <option value="thrust">Thrust (N)</option>
            <option value="pressure">Pressure (bar)</option>
            <option value="temperature">Temperature (°C)</option>
            <option value="vibration">Vibration (g)</option>
            <option value="heat_shield_temp">Heat Shield Temp (°C)</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-lg font-semibold">Compare Launch</label>
          <select
            className="p-2 border rounded text-lg bg-white"
            value={compareLaunch || ""}
            onChange={(e) => setCompareLaunch(e.target.value)}
          >
            <option value="" disabled>Select to Compare</option>
            <option value="">None</option>
            {data.launchNames && Object.entries(data.launchNames).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            className="p-2 border rounded text-lg bg-white"
            value={compareMetric}
            onChange={(e) => setCompareMetric(e.target.value)}
          >
            <option value="thrust">Thrust (N)</option>
            <option value="pressure">Pressure (bar)</option>
            <option value="temperature">Temperature (°C)</option>
            <option value="vibration">Vibration (g)</option>
            <option value="heat_shield_temp">Heat Shield Temp (°C)</option>
          </select>
        </div>
      </div>
      {zoomedMetric ? (
        <div className="w-full max-w-4xl">
          <button
            className="mb-4 p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setZoomedMetric(null)}
          >
            Back to All Charts
          </button>
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <Line
              data={createChartData(
                `${selectedMetric === 'thrust' ? 'Thrust (N)' : selectedMetric === 'pressure' ? 'Pressure (bar)' :
                  selectedMetric === 'temperature' ? 'Temperature (°C)' : selectedMetric === 'vibration' ? 'Vibration (g)' : 'Heat Shield Temp (°C)'} - ${data.launchNames[selectedLaunch] || 'Selected'}`,
                currentData[selectedMetric],
                `${compareMetric === 'thrust' ? 'Thrust (N)' : compareMetric === 'pressure' ? 'Pressure (bar)' :
                  compareMetric === 'temperature' ? 'Temperature (°C)' : compareMetric === 'vibration' ? 'Vibration (g)' : 'Heat Shield Temp (°C)'} - ${data.launchNames[compareLaunch] || 'Compared'}`,
                compareData ? compareData[compareMetric] : [],
                'rgba(255, 99, 132, 1)',
                'rgba(75, 192, 192, 1)',
                currentData.labels
              )}
              options={{
                ...chartOptions,
                scales: { y: { beginAtZero: true, suggestedMax: getSuggestedMax(selectedMetric, compareMetric) } },
                maintainAspectRatio: false,
                height: 400,
              }}
            />
          </div>
        </div>
      ) : (
        <div className={selectedLaunch && compareLaunch && selectedMetric !== compareMetric ? 'block' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl overflow-x-auto'}>
          {selectedLaunch && compareLaunch && selectedMetric !== compareMetric ? (
            <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-4xl">
              <div onClick={() => handleChartClick(0)} style={{ cursor: 'pointer' }}>
                <Line
                  data={createChartData(
                    `${selectedMetric === 'thrust' ? 'Thrust (N)' : selectedMetric === 'pressure' ? 'Pressure (bar)' :
                      selectedMetric === 'temperature' ? 'Temperature (°C)' : selectedMetric === 'vibration' ? 'Vibration (g)' : 'Heat Shield Temp (°C)'} - ${data.launchNames[selectedLaunch] || 'Selected'}`,
                    currentData[selectedMetric],
                    `${compareMetric === 'thrust' ? 'Thrust (N)' : compareMetric === 'pressure' ? 'Pressure (bar)' :
                      compareMetric === 'temperature' ? 'Temperature (°C)' : compareMetric === 'vibration' ? 'Vibration (g)' : 'Heat Shield Temp (°C)'} - ${data.launchNames[compareLaunch] || 'Compared'}`,
                    compareData ? compareData[compareMetric] : [],
                    'rgba(255, 99, 132, 1)',
                    'rgba(75, 192, 192, 1)',
                    currentData.labels
                  )}
                  options={{ ...chartOptions, scales: { y: { beginAtZero: true, suggestedMax: getSuggestedMax(selectedMetric, compareMetric) } } }}
                  ref={el => chartRefs.current[0] = el}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-lg shadow-lg min-w-[300px]" onClick={() => handleChartClick(0)} style={{ cursor: 'pointer' }}>
                <Line
                  data={createChartData(
                    'Thrust (N) - ' + (data.launchNames[selectedLaunch] || 'Selected'),
                    currentData.thrust,
                    'Thrust (N) - ' + (data.launchNames[compareLaunch] || 'Compared'),
                    compareData?.thrust || [],
                    'rgba(255, 99, 132, 1)',
                    'rgba(75, 192, 192, 1)',
                    currentData.labels
                  )}
                  options={{ ...chartOptions, scales: { y: { suggestedMax: 20000 } } }}
                  ref={el => chartRefs.current[0] = el}
                />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-lg min-w-[300px]" onClick={() => handleChartClick(1)} style={{ cursor: 'pointer' }}>
                <Line
                  data={createChartData(
                    'Pressure (bar) - ' + (data.launchNames[selectedLaunch] || 'Selected'),
                    currentData.pressure,
                    'Pressure (bar) - ' + (data.launchNames[compareLaunch] || 'Compared'),
                    compareData?.pressure || [],
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                    currentData.labels
                  )}
                  options={{ ...chartOptions, scales: { y: { suggestedMax: 200 } } }}
                  ref={el => chartRefs.current[1] = el}
                />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-lg min-w-[300px]" onClick={() => handleChartClick(2)} style={{ cursor: 'pointer' }}>
                <Line
                  data={createChartData(
                    'Temperature (°C) - ' + (data.launchNames[selectedLaunch] || 'Selected'),
                    currentData.temperature,
                    'Temperature (°C) - ' + (data.launchNames[compareLaunch] || 'Compared'),
                    compareData?.temperature || [],
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)',
                    currentData.labels
                  )}
                  options={{ ...chartOptions, scales: { y: { suggestedMax: 1000 } } }}
                  ref={el => chartRefs.current[2] = el}
                />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-lg min-w-[300px]" onClick={() => handleChartClick(3)} style={{ cursor: 'pointer' }}>
                <Line
                  data={createChartData(
                    'Vibration (g) - ' + (data.launchNames[selectedLaunch] || 'Selected'),
                    currentData.vibration,
                    'Vibration (g) - ' + (data.launchNames[compareLaunch] || 'Compared'),
                    compareData?.vibration || [],
                    'rgba(54, 162, 235, 1)',
                    'rgba(153, 102, 255, 1)',
                    currentData.labels
                  )}
                  options={{ ...chartOptions, scales: { y: { suggestedMax: 15 } } }}
                  ref={el => chartRefs.current[3] = el}
                />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-lg min-w-[300px]" onClick={() => handleChartClick(4)} style={{ cursor: 'pointer' }}>
                <Line
                  data={createChartData(
                    'Heat Shield Temp (°C) - ' + (data.launchNames[selectedLaunch] || 'Selected'),
                    currentData.heat_shield_temp,
                    'Heat Shield Temp (°C) - ' + (data.launchNames[compareLaunch] || 'Compared'),
                    compareData?.heat_shield_temp || [],
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 99, 132, 1)',
                    currentData.labels
                  )}
                  options={{ ...chartOptions, scales: { y: { suggestedMax: 2000 } } }}
                  ref={el => chartRefs.current[4] = el}
                />
              </div>
            </>
          )}
        </div>
      )}
      <p className="mt-4 text-lg text-gray-700">Change dropdowns to update charts, or click a chart box to zoom and compare.</p>
    </div>
  );
}

export default App;