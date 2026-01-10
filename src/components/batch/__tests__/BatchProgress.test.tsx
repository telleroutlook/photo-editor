/**
 * BatchProgress.test.tsx - Component tests for BatchProgress
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchProgress } from '../BatchProgress';
import type { BatchStatus, BatchItemStatus } from '../../../types/batch';

describe('BatchProgress', () => {
  const mockStatus: BatchStatus = {
    total: 5,
    completed: 2,
    failed: 1,
    processing: 1,
    pending: 1,
    progress: 40,
  };

  const mockItems: BatchItemStatus[] = [
    {
      imageId: 'img1',
      fileName: 'test1.jpg',
      status: 'completed',
      progress: 100,
      result: {
        imageData: new ArrayBuffer(1024),
        width: 1920,
        height: 1080,
        size: 102400,
      },
    },
    {
      imageId: 'img2',
      fileName: 'test2.png',
      status: 'completed',
      progress: 100,
      result: {
        imageData: new ArrayBuffer(2048),
        width: 1280,
        height: 720,
        size: 204800,
      },
    },
    {
      imageId: 'img3',
      fileName: 'test3.jpg',
      status: 'failed',
      progress: 0,
      error: 'Failed to process image',
    },
    {
      imageId: 'img4',
      fileName: 'test4.png',
      status: 'processing',
      progress: 60,
    },
    {
      imageId: 'img5',
      fileName: 'test5.jpg',
      status: 'pending',
      progress: 0,
    },
  ];

  it('should render progress bar with correct percentage', () => {
    render(<BatchProgress status={mockStatus} items={mockItems} />);

    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('should display status counts', () => {
    render(<BatchProgress status={mockStatus} items={mockItems} />);

    expect(screen.getByText(/2\/5 completed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 processing/i)).toBeInTheDocument();
  });

  it('should not display failed count when zero', () => {
    const statusWithoutFailures: BatchStatus = {
      ...mockStatus,
      failed: 0,
    };

    render(<BatchProgress status={statusWithoutFailures} items={mockItems} />);

    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it('should not display processing count when zero', () => {
    const statusWithoutProcessing: BatchStatus = {
      ...mockStatus,
      processing: 0,
    };

    render(<BatchProgress status={statusWithoutProcessing} items={mockItems} />);

    expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
  });

  it('should display per-image details when showDetails is true', () => {
    render(<BatchProgress status={mockStatus} items={mockItems} showDetails={true} />);

    expect(screen.getByText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByText('test2.png')).toBeInTheDocument();
    expect(screen.getByText('test3.jpg')).toBeInTheDocument();
    expect(screen.getByText('test4.png')).toBeInTheDocument();
    expect(screen.getByText('test5.jpg')).toBeInTheDocument();
  });

  it('should not display per-image details when showDetails is false', () => {
    render(<BatchProgress status={mockStatus} items={mockItems} showDetails={false} />);

    expect(screen.queryByText('test1.jpg')).not.toBeInTheDocument();
  });

  it('should display completion summary when progress is 100%', () => {
    const completedStatus: BatchStatus = {
      total: 5,
      completed: 4,
      failed: 1,
      processing: 0,
      pending: 0,
      progress: 100,
    };

    render(<BatchProgress status={completedStatus} items={mockItems} />);

    expect(screen.getByText(/Batch processing complete!/i)).toBeInTheDocument();
    expect(screen.getByText(/4 of 5 images succeeded/i)).toBeInTheDocument();
    expect(screen.getByText(/\(1 failed\)/i)).toBeInTheDocument();
  });

  it('should display correct status for each item', () => {
    render(<BatchProgress status={mockStatus} items={mockItems} showDetails={true} />);

    // Completed items should show dimensions and size
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
    expect(screen.getByText('1280 × 720')).toBeInTheDocument();

    // Failed item should show error message
    expect(screen.getByText('Failed to process image')).toBeInTheDocument();

    // Processing item should show capitalize status
    expect(screen.getByText(/Processing/i)).toBeInTheDocument();

    // Pending item should show status
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  it('should calculate and display total size', () => {
    render(<BatchProgress status={mockStatus} items={mockItems} />);

    // Total size: 102400 + 204800 = 307200 bytes = 300 KB
    expect(screen.getByText(/300 KB/i)).toBeInTheDocument();
  });

  it('should hide details section when items array is empty', () => {
    render(<BatchProgress status={mockStatus} items={[]} />);

    expect(screen.queryByText('test1.jpg')).not.toBeInTheDocument();
  });
});
