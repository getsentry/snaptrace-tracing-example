import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UploadForm from './components/UploadForm';
import Gallery from './components/Gallery';
import { Camera, Sparkles } from 'lucide-react';
import './App.css';

export interface UploadInfo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  previewUrl?: string;
  objectKey?: string;
}

function App() {
  const [uploads, setUploads] = useState<UploadInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = (uploadInfo: UploadInfo) => {
    setUploads(prev => [uploadInfo, ...prev]);
  };

  const updateUploadStatus = (id: string, status: UploadInfo['status']) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status } : upload
    ));
  };

  return (
    <div className="app">
      <div className="background-gradient" />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container"
      >
        <motion.header 
          className="header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="logo-container">
            <div className="logo">
              <Camera size={32} />
              <Sparkles className="sparkle" size={16} />
            </div>
            <h1 className="app-title">SnapTrace</h1>
          </div>
          <p className="tagline">Capture moments, trace performance</p>
        </motion.header>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <UploadForm 
            onUploadComplete={handleUploadComplete}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            updateUploadStatus={updateUploadStatus}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3 }}
            >
              <Gallery uploads={uploads} />
            </motion.div>
          )}
        </AnimatePresence>

        {uploads.length === 0 && !isUploading && (
          <motion.div 
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Camera size={48} className="empty-icon" />
            <p>Your photos will appear here</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default App;