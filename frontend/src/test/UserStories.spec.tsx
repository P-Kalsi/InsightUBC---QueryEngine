// Done with the aid of AI

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddDatasetForm from '../components/AddDatasetForm';
import DatasetList from '../components/DatasetList';
import DatasetCard from '../components/DatasetCard';
import InsightsCompare from '../components/InsightsCompare';

const mockFetch = vi.fn();
global.fetch = mockFetch;

Object.defineProperty(window, 'confirm', {
	writable: true,
	value: vi.fn(() => true),
});

describe('Frontend User Story Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
	});

	describe('User Story 1: Invalid ID/Dataset Feedback', () => {
		it('should have disabled submit button when ID is empty', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			const submitButton = screen.getByRole('button', { name: /add dataset/i });
			expect(submitButton).toBeDisabled();
		});

		it('should have disabled submit button when no file is selected', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			const idInput = screen.getByPlaceholderText(/enter dataset id/i);
			fireEvent.change(idInput, { target: { value: 'testDataset' } });
			
			const submitButton = screen.getByRole('button', { name: /add dataset/i });
			expect(submitButton).toBeDisabled();
		});

		it('should have input field for dataset ID', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			const idInput = screen.getByPlaceholderText(/enter dataset id/i);
			expect(idInput).toBeInTheDocument();
		});

		it('should have file input for ZIP upload', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			const fileInput = document.querySelector('input[type="file"]');
			expect(fileInput).toBeInTheDocument();
			expect(fileInput).toHaveAttribute('accept', '.zip');
		});

		it('should have error message container with proper class', () => {
			const { container } = render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			expect(container.querySelector('.add-dataset-form')).toBeInTheDocument();
		});
	});

	describe('User Story 2: Auto-update After Adding Dataset', () => {
		it('should have form with proper structure', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			expect(screen.getByRole('heading', { name: /add dataset/i })).toBeInTheDocument();
			expect(screen.getByLabelText(/dataset id/i)).toBeInTheDocument();
		});

		it('should update ID input value when typing', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			const idInput = screen.getByPlaceholderText(/enter dataset id/i) as HTMLInputElement;
			fireEvent.change(idInput, { target: { value: 'myNewDataset' } });
			
			expect(idInput.value).toBe('myNewDataset');
		});

		it('should have Choose ZIP File button', () => {
			render(<AddDatasetForm onDatasetAdded={() => {}} apiBaseUrl="http://localhost:4321" />);
			
			expect(screen.getByText(/choose zip file/i)).toBeInTheDocument();
		});
	});

	describe('User Story 3: View Dataset List with IDs', () => {
		it('should display message when no datasets exist', () => {
			render(
				<DatasetList 
					datasets={[]} 
					loading={false} 
					error={null} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/no datasets/i)).toBeInTheDocument();
		});

		it('should display loading state', () => {
			render(
				<DatasetList 
					datasets={[]} 
					loading={true} 
					error={null} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/loading/i)).toBeInTheDocument();
		});

		it('should display dataset IDs in the list', () => {
			const datasets = [
				{ id: 'dataset1', kind: 'sections', numRows: 100 },
				{ id: 'dataset2', kind: 'sections', numRows: 200 },
			];
			
			render(
				<DatasetList 
					datasets={datasets} 
					loading={false} 
					error={null} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText('dataset1')).toBeInTheDocument();
			expect(screen.getByText('dataset2')).toBeInTheDocument();
		});

		it('should display dataset kind and row count', () => {
			const datasets = [
				{ id: 'testData', kind: 'sections', numRows: 1500 },
			];
			
			render(
				<DatasetList 
					datasets={datasets} 
					loading={false} 
					error={null} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/sections/i)).toBeInTheDocument();
			expect(screen.getByText(/1,500/)).toBeInTheDocument();
		});

		it('should display error message when there is an error', () => {
			render(
				<DatasetList 
					datasets={[]} 
					loading={false} 
					error="Failed to load datasets" 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/failed to load datasets/i)).toBeInTheDocument();
		});

		it('should have consistent styling with datasets-grid class', () => {
			const datasets = [
				{ id: 'dataset1', kind: 'sections', numRows: 100 },
			];
			
			const { container } = render(
				<DatasetList 
					datasets={datasets} 
					loading={false} 
					error={null} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(container.querySelector('.datasets-grid')).toBeInTheDocument();
		});
	});

	describe('User Story 4: Delete Datasets', () => {
		it('should display Remove button for each dataset', () => {
			const dataset = { id: 'testDataset', kind: 'sections', numRows: 100 };
			
			render(
				<DatasetCard 
					dataset={dataset} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
		});

		it('should display dataset ID in card', () => {
			const dataset = { id: 'myTestDataset', kind: 'sections', numRows: 500 };
			
			render(
				<DatasetCard 
					dataset={dataset} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText('myTestDataset')).toBeInTheDocument();
		});

		it('should display dataset kind', () => {
			const dataset = { id: 'testDataset', kind: 'sections', numRows: 100 };
			
			render(
				<DatasetCard 
					dataset={dataset} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/sections/i)).toBeInTheDocument();
		});

		it('should display row count with formatting', () => {
			const dataset = { id: 'testDataset', kind: 'sections', numRows: 64612 };
			
			render(
				<DatasetCard 
					dataset={dataset} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/64,612/)).toBeInTheDocument();
		});

		it('should have dataset-card class for styling', () => {
			const dataset = { id: 'testDataset', kind: 'sections', numRows: 100 };
			
			const { container } = render(
				<DatasetCard 
					dataset={dataset} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(container.querySelector('.dataset-card')).toBeInTheDocument();
		});

		it('should call fetch with DELETE method when remove is clicked', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ result: 'testDataset' }),
			});

			const dataset = { id: 'testDataset', kind: 'sections', numRows: 100 };
			
			render(
				<DatasetCard 
					dataset={dataset} 
					onDatasetRemoved={() => {}} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			const removeButton = screen.getByRole('button', { name: /remove/i });
			fireEvent.click(removeButton);
			
			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					'http://localhost:4321/dataset/testDataset',
					expect.objectContaining({ method: 'DELETE' })
				);
			});
		});
	});

	describe('User Story 5: Visual Insights', () => {
		it('should display message when no datasets available', () => {
			render(
				<InsightsCompare 
					datasets={[]} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/no datasets available/i)).toBeInTheDocument();
		});

		it('should display dataset selector when datasets exist', () => {
			const datasets = [
				{ id: 'testDataset', kind: 'sections', numRows: 100 },
			];
			
			render(
				<InsightsCompare 
					datasets={datasets} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(screen.getByText(/select dataset/i)).toBeInTheDocument();
			expect(screen.getByRole('combobox')).toBeInTheDocument();
		});

		it('should display dataset options in dropdown', () => {
			const datasets = [
				{ id: 'dataset1', kind: 'sections', numRows: 100 },
				{ id: 'dataset2', kind: 'sections', numRows: 200 },
			];
			
			render(
				<InsightsCompare 
					datasets={datasets} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			const select = screen.getByRole('combobox');
			expect(select).toBeInTheDocument();
			
			const options = select.querySelectorAll('option');
			expect(options.length).toBeGreaterThanOrEqual(2);
		});

		it('should have insights-compare class for styling', () => {
			const datasets = [
				{ id: 'testDataset', kind: 'sections', numRows: 100 },
			];
			
			const { container } = render(
				<InsightsCompare 
					datasets={datasets} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			expect(container.querySelector('.insights-compare')).toBeInTheDocument();
		});

		it('should allow selecting a dataset from dropdown', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					result: {
						insight1: [],
						insight2: [],
						insight3: [],
					},
				}),
			});

			const datasets = [
				{ id: 'dataset1', kind: 'sections', numRows: 100 },
				{ id: 'dataset2', kind: 'sections', numRows: 200 },
			];
			
			render(
				<InsightsCompare 
					datasets={datasets} 
					apiBaseUrl="http://localhost:4321" 
				/>
			);
			
			const select = screen.getByRole('combobox') as HTMLSelectElement;
			fireEvent.change(select, { target: { value: 'dataset1' } });
			
			await waitFor(() => {
				expect(select.value).toBe('dataset1');
			});
		});
	});
});
