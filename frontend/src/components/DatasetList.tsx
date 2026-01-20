import { useState } from 'react';
import DatasetCard from './DatasetCard';
import './DatasetList.css';

interface Dataset {
	id: string;
	kind: string;
	numRows: number;
}

interface DatasetListProps {
	datasets: Dataset[];
	loading: boolean;
	error: string | null;
	onDatasetRemoved: () => void;
	apiBaseUrl: string;
}

function DatasetList({
	datasets,
	loading,
	error,
	onDatasetRemoved,
	apiBaseUrl,
}: DatasetListProps) {
	if (loading) {
		return (
			<div className="dataset-list">
				<h2>Datasets</h2>
				<div className="loading">Loading datasets...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="dataset-list">
				<h2>Datasets</h2>
				<div className="error-message">{error}</div>
			</div>
		);
	}

	if (datasets.length === 0) {
		return (
			<div className="dataset-list">
				<h2>Datasets</h2>
				<div className="empty-message">No datasets available. Add a dataset to get started.</div>
			</div>
		);
	}

	return (
		<div className="dataset-list">
			<h2>Datasets</h2>
			<div className="datasets-grid">
				{datasets.map((dataset) => (
					<DatasetCard
						key={dataset.id}
						dataset={dataset}
						onDatasetRemoved={onDatasetRemoved}
						apiBaseUrl={apiBaseUrl}
					/>
				))}
			</div>
		</div>
	);
}

export default DatasetList;

