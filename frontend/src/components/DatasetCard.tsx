import { useState } from 'react';
import './DatasetCard.css';

interface Dataset {
	id: string;
	kind: string;
	numRows: number;
}

interface DatasetCardProps {
	dataset: Dataset;
	onDatasetRemoved: () => void;
	apiBaseUrl: string;
}

function DatasetCard({ dataset, onDatasetRemoved, apiBaseUrl }: DatasetCardProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isRemoving, setIsRemoving] = useState(false);

	const handleRemove = async () => {
		if (!confirm(`Are you sure you want to remove dataset "${dataset.id}"?`)) {
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`${apiBaseUrl}/dataset/${dataset.id}`, {
				method: 'DELETE',
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to remove dataset');
			}

			setIsRemoving(true);
			setTimeout(() => {
				onDatasetRemoved();
			}, 400);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to remove dataset');
			setLoading(false);
		}
	};

	return (
		<div className={`dataset-card ${isRemoving ? 'dataset-card-removing' : ''}`}>
			<div className="dataset-header">
				<h3>{dataset.id}</h3>
				<button
					className="remove-button"
					onClick={handleRemove}
					disabled={loading}
				>
					{loading ? 'Removing...' : 'Remove'}
				</button>
			</div>
			<div className="dataset-info">
				<p><strong>Type:</strong> {dataset.kind}</p>
				<p><strong>Rows:</strong> {dataset.numRows.toLocaleString()}</p>
			</div>
			{error && <div className="error-message">{error}</div>}
		</div>
	);
}

export default DatasetCard;
