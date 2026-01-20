import { useState, useEffect, type ChangeEvent } from 'react';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	ArcElement,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import Loader from './Loader';
import './InsightsView.css';

// Got help from AI to implement the graph views
ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	ArcElement,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend
);

const useDarkMode = () => {
	const [isDark, setIsDark] = useState(() =>
		document.body.classList.contains('dark-mode')
	);

	useEffect(() => {
		const observer = new MutationObserver(() => {
			setIsDark(document.body.classList.contains('dark-mode'));
		});
		observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	}, []);

	return isDark;
};

interface InsightsViewProps {
	datasetId: string;
	apiBaseUrl: string;
}

interface InsightData {
	insight1: any[];
	insight2: any[];
	insight3: any[];
}

function InsightsView({ datasetId, apiBaseUrl }: InsightsViewProps) {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [insightData, setInsightData] = useState<InsightData | null>(null);
	const [allDepts, setAllDepts] = useState<string[]>([]);
	const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
	const isDarkMode = useDarkMode();

	const chartTextColor = isDarkMode ? '#aaa' : '#666';
	const chartGridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

	useEffect(() => {
		setSelectedDepts([]);
		void loadInsights([], true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [datasetId]);

	const loadInsights = async (depts: string[] | undefined, isInitial = false) => {
		try {
			if (isInitial) {
				setLoading(true);
			} else {
				setRefreshing(true);
			}
			setError(null);
			const params =
				depts && depts.length > 0 ? `?depts=${encodeURIComponent(depts.join(','))}` : '';
			const response = await fetch(`${apiBaseUrl}/dataset/${datasetId}/insights${params}`);
			if (!response.ok) {
				throw new Error('Failed to load insights');
			}
			const data = await response.json();
			setInsightData(data.result);
			if ((!depts || depts.length === 0) && data.result?.insight2?.length > 0) {
				const deptKeyAll = Object.keys(data.result.insight2[0] || {})[0] || '';
				const deptsAll: string[] = Array.from(
					new Set(
						data.result.insight2.map((item: any) => String(item[deptKeyAll]))
					)
				);
				setAllDepts(deptsAll);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load insights');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	const handleDeptChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const options = Array.from(e.target.selectedOptions);
		const next = options.map((o) => o.value);
		setSelectedDepts(next);
		void loadInsights(next, false);
	};

	const clearFilters = () => {
		setSelectedDepts([]);
		void loadInsights([], false);
	};

	if (loading && !insightData) {
		return (
			<div className="insights-initial-loading">
				<Loader />
				<p>Loading insights...</p>
			</div>
		);
	}

	if (error && !insightData) {
		return <div className="insights-error">Error: {error}</div>;
	}

	if (!insightData) {
		return <div className="insights-error">No insight data available</div>;
	}

	const deptKey = Object.keys(insightData.insight1[0] || {})[0] || '';
	const allDepartments = insightData.insight1.map((item) => (item[deptKey] as string).toUpperCase());
	const allAvgGrades = insightData.insight1.map((item) => item.avgGrade as number);

	const departments = allDepartments.slice(0, 20);
	const avgGrades = allAvgGrades.slice(0, 20);

	const barPalette = [
		'rgba(54, 162, 235, 0.7)',
		'rgba(255, 99, 132, 0.7)',
		'rgba(255, 206, 86, 0.7)',
		'rgba(75, 192, 192, 0.7)',
		'rgba(153, 102, 255, 0.7)',
		'rgba(255, 159, 64, 0.7)',
		'rgba(99, 255, 132, 0.7)',
		'rgba(255, 99, 255, 0.7)',
		'rgba(83, 102, 255, 0.7)',
		'rgba(199, 199, 199, 0.7)',
	];
	const barColors = departments.map((_, idx) => barPalette[idx % barPalette.length]);
	const barBorderColors = barColors.map((c) => c.replace('0.7', '1'));

	const insight1Data = {
		labels: departments,
		datasets: [
			{
				label: 'Average Grade',
				data: avgGrades,
				backgroundColor: barColors,
				borderColor: barBorderColors,
				borderWidth: 1,
			},
		],
	};

	const dept2Key = Object.keys(insightData.insight2[0] || {})[0] || '';
	const deptLabels = insightData.insight2.map((item) => (item[dept2Key] as string).toUpperCase()).slice(0, 10);
	const deptCounts = insightData.insight2.map((item) => item.count as number).slice(0, 10);

	const generateColors = (count: number) => {
		const baseColors = [
			'rgba(255, 99, 132, 0.7)',
			'rgba(54, 162, 235, 0.7)',
			'rgba(255, 206, 86, 0.7)',
			'rgba(75, 192, 192, 0.7)',
			'rgba(153, 102, 255, 0.7)',
			'rgba(255, 159, 64, 0.7)',
			'rgba(199, 199, 199, 0.7)',
			'rgba(83, 102, 255, 0.7)',
			'rgba(255, 99, 255, 0.7)',
			'rgba(99, 255, 132, 0.7)',
		];
		const result = [];
		for (let i = 0; i < count; i++) {
			result.push(baseColors[i % baseColors.length]);
		}
		return result;
	};

	const insight2Data = {
		labels: deptLabels,
		datasets: [
			{
				label: 'Number of Sections',
				data: deptCounts,
				backgroundColor: generateColors(10),
				borderColor: generateColors(10).map((c) => c.replace('0.7', '1')),
				borderWidth: 1,
			},
		],
	};

	const insight3Keys = Object.keys(insightData.insight3[0] || {});
	const insight3DeptKey = insight3Keys.find(k => k.endsWith('_dept')) || '';
	const courseIdKey = insight3Keys.find(k => k.endsWith('_id')) || '';

	const topCourses = insightData.insight3
		.slice(0, 10)
		.map((item) => {
			const dept = insight3DeptKey ? String(item[insight3DeptKey] || '').toUpperCase() : '';
			const id = courseIdKey ? String(item[courseIdKey] || '') : '';
			const courseName = dept && id ? `${dept} ${id}` : (dept || id || 'Unknown');
			return {
				courseId: courseName,
				avgGrade: item.avgGrade as number,
			};
		});

	const insight3Data = {
		labels: topCourses.map((c) => c.courseId),
		datasets: [
			{
				label: 'Average Grade',
				data: topCourses.map((c) => c.avgGrade),
				borderColor: 'rgba(75, 192, 192, 1)',
				backgroundColor: 'rgba(75, 192, 192, 0.3)',
				tension: 0.3,
				fill: true,
			},
		],
	};

	return (
		<div className="insights-view">
			{allDepts.length > 0 && (
				<div className="insights-filters">
					<div className="insights-filters-header">
						<span>Filter by department</span>
						<button
							type="button"
							className="insights-clear-button"
							onClick={clearFilters}
							disabled={selectedDepts.length === 0}
						>
							Clear
						</button>
					</div>
					<select
						multiple
						value={selectedDepts}
						onChange={handleDeptChange}
						className="insights-dept-select"
					>
						{allDepts.map((dept) => (
							<option key={dept} value={dept}>
								{dept.toUpperCase()}
							</option>
						))}
					</select>
					<small className="insights-dept-help">
						Cmd/Ctrl + click for multi-select
					</small>
				</div>
			)}

			<div className={`insights-grid ${refreshing ? 'insights-grid-refreshing' : ''}`}>
				{refreshing && (
					<div className="insights-refresh-overlay">
						<Loader />
					</div>
				)}
				<div className="insight-card">
					<h4>Average Grade by Department {departments.length < allDepartments.length && `(Top ${departments.length})`}</h4>
					{departments.length > 0 ? (
						<div className="chart-container">
							<Bar
								data={insight1Data}
								options={{
									responsive: true,
									maintainAspectRatio: true,
									aspectRatio: 1.5,
									plugins: {
										legend: {
											display: false,
										},
										tooltip: {
											enabled: true,
										},
									},
									scales: {
										y: {
											beginAtZero: false,
											min: Math.max(0, Math.min(...avgGrades) - 5),
											title: {
												display: true,
												text: 'Avg Grade',
												font: { size: 11 },
												color: chartTextColor,
											},
											ticks: { font: { size: 10 }, color: chartTextColor },
											grid: { color: chartGridColor },
										},
										x: {
											ticks: {
												font: { size: 9 },
												maxRotation: 45,
												minRotation: 45,
												color: chartTextColor,
											},
											grid: { color: chartGridColor },
										},
									},
								}}
							/>
						</div>
					) : (
						<p>No grade data available</p>
					)}
				</div>

				<div className="insight-card">
					<h4>Courses by Department (Top 10)</h4>
					{deptLabels.length > 0 ? (
						<div className="chart-container chart-container-pie">
							<Pie
								data={insight2Data}
								options={{
									responsive: true,
									maintainAspectRatio: true,
									aspectRatio: 1.3,
									plugins: {
										legend: {
											display: true,
											position: 'right',
											labels: {
												font: { size: 10 },
												boxWidth: 12,
												padding: 6,
												color: chartTextColor,
											},
										},
										tooltip: {
											enabled: true,
										},
									},
								}}
							/>
						</div>
					) : (
						<p>No department data available</p>
					)}
				</div>

				<div className="insight-card">
					<h4>Top 10 Courses by Average Grade</h4>
					{topCourses.length > 0 ? (
						<div className="chart-container">
							<Line
								data={insight3Data}
								options={{
									responsive: true,
									maintainAspectRatio: true,
									aspectRatio: 1.5,
									plugins: {
										legend: {
											display: false,
										},
										tooltip: {
											enabled: true,
											callbacks: {
												title: (context) => {
													const idx = context[0]?.dataIndex;
													if (idx !== undefined && topCourses[idx]) {
														return topCourses[idx].courseId;
													}
													return '';
												},
												label: (context) => {
													return `Avg Grade: ${context.parsed.y?.toFixed(2) ?? 'N/A'}`;
												},
											},
										},
									},
									scales: {
										y: {
											beginAtZero: false,
											title: {
												display: true,
												text: 'Avg Grade',
												font: { size: 11 },
												color: chartTextColor,
											},
											ticks: { font: { size: 10 }, color: chartTextColor },
											grid: { color: chartGridColor },
										},
										x: {
											title: {
												display: true,
												text: 'Course',
												font: { size: 11 },
												color: chartTextColor,
											},
											ticks: {
												font: { size: 9 },
												maxRotation: 45,
												minRotation: 45,
												color: chartTextColor,
											},
											grid: { color: chartGridColor },
										},
									},
								}}
							/>
						</div>
					) : (
						<p>No course data available</p>
					)}
				</div>
			</div>
		</div>
	);
}

export default InsightsView;
