import styled from 'styled-components';

interface FileUploadButtonProps {
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	fileName?: string;
	accept?: string;
	id?: string;
}

const FileUploadButton = ({ onChange, fileName, accept, id }: FileUploadButtonProps) => {
	return (
		<StyledWrapper>
			<div className="file-upload-container">
				<button className="container-btn-file" type="button">
					{fileName ? fileName : 'Choose ZIP File'}
					<input
						className="file"
						type="file"
						onChange={onChange}
						accept={accept}
						id={id}
					/>
				</button>
			</div>
		</StyledWrapper>
	);
};

const StyledWrapper = styled.div`
	.file-upload-container {
		width: 100%;
	}

	.container-btn-file {
		display: flex;
		position: relative;
		justify-content: center;
		align-items: center;
		background-color: #3C0061;
		color: #fff;
		border-style: none;
		padding: 0.875em 1.5em;
		border-radius: 0.5em;
		overflow: hidden;
		z-index: 1;
		box-shadow: 4px 8px 10px -3px rgba(0, 0, 0, 0.25);
		transition: all 250ms;
		cursor: pointer;
		font-size: 0.95rem;
		width: 100%;
		box-sizing: border-box;
	}

	.container-btn-file input[type="file"] {
		position: absolute;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		left: 0;
		top: 0;
	}

	.container-btn-file::before {
		content: "";
		position: absolute;
		height: 100%;
		width: 0;
		border-radius: 0.5em;
		background-color: #5a0091;
		z-index: -1;
		transition: all 350ms;
		left: 0;
	}

	.container-btn-file:hover::before {
		width: 100%;
	}
`;

export default FileUploadButton;

