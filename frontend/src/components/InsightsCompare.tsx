import { useState, useEffect, useRef } from 'react';
import InsightsView from './InsightsView';
import './InsightsCompare.css';

// Got help from AI to make the comparison between datasets
interface Dataset {
	id: string;
	kind: string;
	numRows: number;
}

interface InsightsCompareProps {
	datasets: Dataset[];
	apiBaseUrl: string;
}

function InsightsCompare({ datasets, apiBaseUrl }: InsightsCompareProps) {
	const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
	const [removingPanels, setRemovingPanels] = useState<Set<string>>(new Set());
	const prevDatasetsRef = useRef<Dataset[]>(datasets);

	useEffect(() => {
		const currentIds = datasets.map(d => d.id);
		const removedIds = prevDatasetsRef.current
			.map(d => d.id)
			.filter(id => !currentIds.includes(id));

		if (removedIds.length > 0) {
			const affectedSelected = selectedDatasets.filter(id => removedIds.includes(id));
			if (affectedSelected.length > 0) {
				setRemovingPanels(new Set(affectedSelected));
				setTimeout(() => {
					setSelectedDatasets(prev => prev.filter(id => currentIds.includes(id)));
					setRemovingPanels(new Set());
				}, 600);
			}
		}

		prevDatasetsRef.current = datasets;
	}, [datasets, selectedDatasets]);

	const handlePrimaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value;
		if (value) {
			setSelectedDatasets((prev) => {
				const newSelection = [value, ...prev.slice(1)];
				return newSelection;
			});
		} else {
			setSelectedDatasets([]);
		}
	};

	const handleAddComparison = () => {
		if (selectedDatasets.length < 3) {
			setSelectedDatasets((prev) => [...prev, '']);
		}
	};

	const handleComparisonChange = (index: number, value: string) => {
		setSelectedDatasets((prev) => {
			const newSelection = [...prev];
			newSelection[index] = value;
			return newSelection;
		});
	};

	const handleRemoveComparison = (index: number) => {
		setSelectedDatasets((prev) => prev.filter((_, i) => i !== index));
	};

	const availableForComparison = (currentIndex: number) => {
		return datasets.filter(
			(d) => !selectedDatasets.some((s, i) => s === d.id && i !== currentIndex)
		);
	};

	if (datasets.length === 0) {
		return (
			<div className="insights-compare">
				<h2>Dataset Insights</h2>
				<p className="no-datasets-message">
					No datasets available. Add a dataset first to view insights.
				</p>
			</div>
		);
	}

	return (
		<div className="insights-compare">
			<h2>Dataset Insights</h2>

			<div className="dataset-selector">
				<div className="selector-row primary-selector">
					<label htmlFor="primary-dataset">Select Dataset:</label>
					<select
						id="primary-dataset"
						value={selectedDatasets[0] || ''}
						onChange={handlePrimaryChange}
						className="dataset-dropdown"
					>
						<option value="">-- Choose a dataset --</option>
						{datasets.map((d) => (
							<option key={d.id} value={d.id}>
								{d.id} ({d.numRows.toLocaleString()} rows)
							</option>
						))}
					</select>
				</div>

				{selectedDatasets.length > 0 && selectedDatasets[0] && (
					<div className="comparison-controls">
						{selectedDatasets.slice(1).map((datasetId, idx) => (
							<div key={idx + 1} className="selector-row comparison-selector">
								<label>Compare with:</label>
								<select
									value={datasetId}
									onChange={(e) => handleComparisonChange(idx + 1, e.target.value)}
									className="dataset-dropdown"
								>
									<option value="">-- Choose a dataset --</option>
									{availableForComparison(idx + 1).map((d) => (
										<option key={d.id} value={d.id}>
											{d.id} ({d.numRows.toLocaleString()} rows)
										</option>
									))}
								</select>
								<button
									type="button"
									className="remove-comparison-btn"
									onClick={() => handleRemoveComparison(idx + 1)}
									title="Remove comparison"
								>
									×
								</button>
							</div>
						))}

						{selectedDatasets.length < 3 && datasets.length > selectedDatasets.length && (
							<button
								type="button"
								className="add-comparison-btn"
								onClick={handleAddComparison}
							>
								+ Add Dataset to Compare
							</button>
						)}
					</div>
				)}
			</div>

			{selectedDatasets.length > 0 && selectedDatasets[0] && (
				<div className={`insights-panels panels-${selectedDatasets.filter(s => s).length}`}>
					{selectedDatasets.map((datasetId, idx) => {
						if (!datasetId) return null;
						const isRemoving = removingPanels.has(datasetId);
						return (
							<div
								key={datasetId}
								className={`insights-panel ${isRemoving ? 'insights-panel-removing' : ''}`}
							>
								<div className="panel-header">
									<h3>{datasetId}</h3>
									{idx > 0 && (
										<span className="comparison-badge">Comparison {idx}</span>
									)}
								</div>
								<InsightsView datasetId={datasetId} apiBaseUrl={apiBaseUrl} />
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default InsightsCompare;

