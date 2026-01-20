import { useState, useEffect } from 'react';
import './App.css';
import DatasetList from './components/DatasetList';
import AddDatasetForm from './components/AddDatasetForm';
import InsightsCompare from './components/InsightsCompare';
import DarkModeToggle from './components/DarkModeToggle';

interface Dataset {
	id: string;
	kind: string;
	numRows: number;
}
// AI Used to help all functions used in this file such as loadDatasets, handleDatasetAdded etc...
function App() {
	const [datasets, setDatasets] = useState<Dataset[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDarkMode, setIsDarkMode] = useState(() => {
		const saved = localStorage.getItem('darkMode');
		return saved ? JSON.parse(saved) : false;
	});

	const API_BASE_URL = 'http://localhost:4321';

	useEffect(() => {
		if (isDarkMode) {
			document.body.classList.add('dark-mode');
		} else {
			document.body.classList.remove('dark-mode');
		}
		localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
	}, [isDarkMode]);

	useEffect(() => {
		loadDatasets();
	}, []);

	const loadDatasets = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`${API_BASE_URL}/datasets`);
			if (!response.ok) {
				throw new Error('Failed to load datasets');
			}
			const data = await response.json();
			setDatasets(data.result || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load datasets');
		} finally {
			setLoading(false);
		}
	};

	const handleDatasetAdded = () => {
		loadDatasets();
	};

	const handleDatasetRemoved = () => {
		loadDatasets();
	};

	const toggleDarkMode = () => {
		setIsDarkMode((prev: boolean) => !prev);
	};

	return (
		<div className="app">
			<header className="app-header">
				<h1>Sections Insights</h1>
				<div className="header-controls">
					<DarkModeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
				</div>
			</header>
			<main className="app-main">
				<div className="app-top-section">
					<AddDatasetForm
						onDatasetAdded={handleDatasetAdded}
						apiBaseUrl={API_BASE_URL}
					/>
					<DatasetList
						datasets={datasets}
						loading={loading}
						error={error}
						onDatasetRemoved={handleDatasetRemoved}
						apiBaseUrl={API_BASE_URL}
					/>
				</div>
				<InsightsCompare
					datasets={datasets}
					apiBaseUrl={API_BASE_URL}
				/>
			</main>
		</div>
	);
}

export default App;
