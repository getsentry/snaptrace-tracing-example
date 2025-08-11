import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, File, Check, AlertCircle, Loader2 } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { UploadInfo } from '../App';
import { API_ENDPOINTS } from '../config/api';
import './UploadForm.css';

interface UploadFormProps {
  onUploadComplete: (uploadInfo: UploadInfo) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
  updateUploadStatus: (id: string, status: UploadInfo['status']) => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ 
  onUploadComplete, 
  isUploading, 
  setIsUploading,
  updateUploadStatus 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      setUploadStatus('error');
      setTimeout(() => {
        setUploadStatus('idle');
        setErrorMessage('');
      }, 3000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrorMessage('File size must be less than 10MB');
      setUploadStatus('error');
      setTimeout(() => {
        setUploadStatus('idle');
        setErrorMessage('');
      }, 3000);
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Start Sentry span for upload using modern API
    const uploadStartTime = Date.now();

    const uploadId = Date.now().toString();
    const uploadInfo: UploadInfo = {
      id: uploadId,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      mimeType: selectedFile.type,
      uploadedAt: new Date(),
      status: 'uploading',
      previewUrl: URL.createObjectURL(selectedFile)
    };

    // Use Sentry.startSpan for the entire upload operation
    await Sentry.startSpan(
      {
        name: 'Upload media',
        op: 'file.upload',
        attributes: {
          'file.size_bytes': selectedFile.size,
          'file.mime_type': selectedFile.type,
        }
      },
      async (span) => {
        try {
          // Add to gallery immediately with uploading status
          onUploadComplete(uploadInfo);

          // Simulate upload progress for UX
          setUploadProgress(10);

          const uploadResponse = await fetch(API_ENDPOINTS.UPLOAD, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileSize: selectedFile.size
            })
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }

          const uploadData = await uploadResponse.json();
          
          // Mark as processing
          setUploadProgress(90);
          setUploadStatus('processing');
          updateUploadStatus(uploadId, 'processing');
          
          // Store job ID for tracking
          uploadInfo.objectKey = uploadData.jobId;
          
          // Set success attributes
          span?.setAttribute('upload.success', true);
          span?.setAttribute('upload.duration_ms', Date.now() - uploadStartTime);
          span?.setAttribute('job.id', uploadData.jobId);

          setUploadProgress(100);
          
          // Simulate processing completion delay
          setTimeout(() => {
            updateUploadStatus(uploadId, 'completed');
            setUploadStatus('success');
            
            // Reset form after success
            setTimeout(() => {
              setSelectedFile(null);
              setUploadProgress(0);
              setUploadStatus('idle');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }, 1500);
          }, 2000);

        } catch (error) {
          console.error('Upload failed:', error);
          
          // Set error attributes
          span?.setAttribute('upload.success', false);
          span?.setAttribute('upload.error', error instanceof Error ? error.message : 'Unknown error');
          
          updateUploadStatus(uploadId, 'failed');
          setUploadStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
          
          setTimeout(() => {
            setUploadStatus('idle');
            setErrorMessage('');
          }, 3000);
        }
      }
    );

    setIsUploading(false);
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload size={48} />;
    if (selectedFile.type.startsWith('image/')) return <Image size={48} />;
    return <File size={48} />;
  };

  return (
    <div className="upload-form-container">
      <motion.div 
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-input"
          className="file-input"
          accept="image/*"
          onChange={handleChange}
          disabled={isUploading}
        />
        
        <label htmlFor="file-input" className="upload-label">
          <AnimatePresence mode="wait">
            {uploadStatus === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="upload-content"
              >
                <div className="upload-icon">{getFileIcon()}</div>
                {selectedFile ? (
                  <>
                    <p className="file-name">{selectedFile.name}</p>
                    <p className="file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="upload-text">Drop your image here or click to browse</p>
                    <p className="upload-hint">Supports: JPG, PNG, GIF (Max 10MB)</p>
                  </>
                )}
              </motion.div>
            )}

            {uploadStatus === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="upload-content"
              >
                <Loader2 size={48} className="spinner" />
                <p className="upload-text">Uploading...</p>
                <div className="progress-bar">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="progress-text">{uploadProgress}%</p>
              </motion.div>
            )}

            {uploadStatus === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="upload-content"
              >
                <Loader2 size={48} className="spinner" />
                <p className="upload-text">Processing your image...</p>
                <p className="upload-hint">Scanning, transcoding, and creating thumbnails</p>
              </motion.div>
            )}

            {uploadStatus === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="upload-content success"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <Check size={48} />
                </motion.div>
                <p className="upload-text">Upload complete!</p>
              </motion.div>
            )}

            {uploadStatus === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="upload-content error"
              >
                <AlertCircle size={48} />
                <p className="upload-text">Upload failed</p>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </label>
      </motion.div>

      {selectedFile && uploadStatus === 'idle' && (
        <motion.button
          className="upload-button"
          onClick={handleUpload}
          disabled={isUploading}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Upload size={20} />
          Upload to SnapTrace
        </motion.button>
      )}
    </div>
  );
};

export default UploadForm;