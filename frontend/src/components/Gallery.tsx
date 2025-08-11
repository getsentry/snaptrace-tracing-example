import React from 'react';
import Masonry from 'react-masonry-css';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, Loader2, Download, Eye, Trash2 } from 'lucide-react';
import { UploadInfo } from '../App';
import './Gallery.css';

interface GalleryProps {
  uploads: UploadInfo[];
}

const Gallery: React.FC<GalleryProps> = ({ uploads }) => {
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  const getStatusIcon = (status: UploadInfo['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 size={16} className="status-icon spinning" />;
      case 'processing':
        return <Clock size={16} className="status-icon processing" />;
      case 'completed':
        return <CheckCircle size={16} className="status-icon success" />;
      case 'failed':
        return <AlertCircle size={16} className="status-icon error" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadInfo['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>Your Gallery</h2>
        <p className="gallery-count">{uploads.length} {uploads.length === 1 ? 'photo' : 'photos'}</p>
      </div>

      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="masonry-grid"
        columnClassName="masonry-grid-column"
      >
        {uploads.map((upload, index) => (
          <motion.div
            key={upload.id}
            className="gallery-item"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: index * 0.05,
              type: "spring",
              stiffness: 200,
              damping: 20
            }}
            whileHover={{ y: -5 }}
          >
            <div className="image-container">
              {upload.previewUrl && (
                <img 
                  src={upload.previewUrl} 
                  alt={upload.fileName}
                  loading="lazy"
                />
              )}
              
              <div className="image-overlay">
                <div className="overlay-actions">
                  <button className="action-button" title="View">
                    <Eye size={20} />
                  </button>
                  <button className="action-button" title="Download">
                    <Download size={20} />
                  </button>
                  <button className="action-button danger" title="Delete">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className={`status-badge ${upload.status}`}>
                {getStatusIcon(upload.status)}
                <span>{getStatusText(upload.status)}</span>
              </div>
            </div>

            <div className="image-info">
              <h3 className="image-title">{upload.fileName}</h3>
              <div className="image-meta">
                <span className="meta-item">{formatFileSize(upload.fileSize)}</span>
                <span className="meta-separator">•</span>
                <span className="meta-item">{formatDate(upload.uploadedAt)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </Masonry>
    </div>
  );
};

export default Gallery;