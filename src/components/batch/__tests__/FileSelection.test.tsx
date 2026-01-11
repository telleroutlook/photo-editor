/**
 * FileSelection.test.tsx - Component tests for FileSelection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileSelection } from '../FileSelection';
import { useImageStore } from '../../../store/imageStore';

// Mock the image store
vi.mock('../../../store/imageStore', () => ({
  useImageStore: vi.fn(),
}));

describe('FileSelection', () => {
  const mockOnSelectionChange = vi.fn();
  const mockImages = [
    {
      id: 'img1',
      url: 'blob:http://localhost/img1',
      fileName: 'test1.jpg',
      width: 1920,
      height: 1080,
      data: new ArrayBuffer(1024),
    },
    {
      id: 'img2',
      url: 'blob:http://localhost/img2',
      fileName: 'test2.png',
      width: 1280,
      height: 720,
      data: new ArrayBuffer(2048),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useImageStore).mockReturnValue({
      images: mockImages,
    });
  });

  it('should render file selection component', () => {
    render(
      <FileSelection
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText(/Select Images \(0 \/ 2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Select All/i)).toBeInTheDocument();
  });

  it('should display empty state when no images', () => {
    vi.mocked(useImageStore).mockReturnValue({
      images: [],
    });

    render(
      <FileSelection
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText(/No images uploaded yet/i)).toBeInTheDocument();
  });

  it('should select all images when clicking Select All', () => {
    render(
      <FileSelection
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const selectAllCheckbox = screen.getByLabelText(/Select All/i);
    fireEvent.click(selectAllCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(
      new Set(['img1', 'img2'])
    );
  });

  it('should deselect all images when all are selected', () => {
    render(
      <FileSelection
        selectedIds={new Set(['img1', 'img2'])}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const deselectAllCheckbox = screen.getByLabelText(/Deselect All/i);
    fireEvent.click(deselectAllCheckbox);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('should toggle individual image selection', () => {
    render(
      <FileSelection
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const imageItems = screen.getAllByRole('button');
    fireEvent.click(imageItems[0]);

    expect(mockOnSelectionChange).toHaveBeenCalled();
  });

  it('should show selected count correctly', () => {
    render(
      <FileSelection
        selectedIds={new Set(['img1'])}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText(/Select Images \(1 \/ 2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 image selected/i)).toBeInTheDocument();
  });

  it('should disable interaction when disabled prop is true', () => {
    render(
      <FileSelection
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
        disabled={true}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox');
    expect(selectAllCheckbox).toBeDisabled();
  });

  it('should clear selection when clicking Clear Selection', () => {
    render(
      <FileSelection
        selectedIds={new Set(['img1', 'img2'])}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    const clearButton = screen.getByText(/Clear Selection/i);
    fireEvent.click(clearButton);

    expect(mockOnSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('should display image filenames and dimensions', () => {
    render(
      <FileSelection
        selectedIds={new Set()}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
    expect(screen.getByText('test2.png')).toBeInTheDocument();
    expect(screen.getByText('1280 × 720')).toBeInTheDocument();
  });
});
