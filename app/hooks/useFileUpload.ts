import { useState } from "react";

/**
 * Custom hook for managing file upload state.
 * 
 * This hook encapsulates file upload state management.
 * 
 * @returns Object containing:
 *   - file: Currently selected file or null
 *   - setFile: Function to set the file
 *   - handleFileChange: Callback for file input change events
 */
export function useFileUpload(
  onFileRead: (filename: string, content: string) => void,
  onError: (message: string) => void
) {
  const [file, setFile] = useState<File | null>(null);

  /**
   * Handles file selection and parsing of `.bingoCards` files.
   * 
   * @param event - React change event from file input element
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile && selectedFile.name.endsWith(".bingoCards")) {
      setFile(selectedFile);
      const reader = new FileReader();
      const filename = selectedFile.name.replace(".bingoCards", "");
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileRead(filename, content);
      };
      reader.readAsText(selectedFile);
    } else {
      onError('uploadError');
    }
  };

  return {
    file,
    setFile,
    handleFileChange,
  };
}
