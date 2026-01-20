import { useState } from 'react';
import FileUploadButton from './FileUploadButton';
import './AddDatasetForm.css';

interface AddDatasetFormProps {
	onDatasetAdded: () => void;
	apiBaseUrl: string;
}

function AddDatasetForm({ onDatasetAdded, apiBaseUrl }: AddDatasetFormProps) {
	const [datasetId, setDatasetId] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setFile(e.target.files[0]);
			setError(null);
			setSuccess(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!datasetId.trim()) {
			setError('Dataset ID is required');
			return;
		}

		if (!file) {
			setError('Please select a file to upload');
			return;
		}

		setLoading(true);

		try {
			const arrayBuffer = await file.arrayBuffer();

			const response = await fetch(`${apiBaseUrl}/dataset/${datasetId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/octet-stream',
				},
				body: arrayBuffer,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to add dataset');
			}

			setSuccess(`Dataset "${datasetId}" added successfully!`);
			setDatasetId('');
			setFile(null);

			onDatasetAdded();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add dataset');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="add-dataset-form">
			<h2>Add Dataset</h2>
			<form onSubmit={handleSubmit}>
				<div className="form-group">
					<label htmlFor="dataset-id">Dataset ID</label>
					<input
						id="dataset-id"
						type="text"
						value={datasetId}
						onChange={(e) => {
							setDatasetId(e.target.value);
							setError(null);
							setSuccess(null);
						}}
						placeholder="Enter dataset ID (no underscores)"
						disabled={loading}
					/>
				</div>
				<div className="form-group">
					<label>Dataset File</label>
					<FileUploadButton
						onChange={handleFileChange}
						fileName={file?.name}
						accept=".zip"
						id="file-input"
					/>
				</div>
				<button type="submit" disabled={loading || !file || !datasetId.trim()}>
					{loading ? 'Adding...' : 'Add Dataset'}
				</button>
			</form>
			{error && <div className="error-message">{error}</div>}
			{success && <div className="success-message">{success}</div>}
		</div>
	);
}

export default AddDatasetForm;
