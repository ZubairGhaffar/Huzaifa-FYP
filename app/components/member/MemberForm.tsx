"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { MemberInput } from "../../types";
import { 
  detectFaceFromImage, 
  loadImageDataFromFile,
  imageDataToBlob 
} from "../../lib/face/detection";
import { generateFaceEmbedding } from "../../lib/embedding/generator";
import { createMember } from "../../lib/api/members";

interface MemberFormProps {
  onMemberAdded?: () => void;
  onCancel?: () => void;
}

interface ImageFile {
  id: string; // Add unique ID for each image
  file: File;
  preview: string;
  faceDetected: boolean;
  faceImageData?: ImageData | null;
  faceBoundingBox?: any;
}

export function MemberForm({ onMemberAdded, onCancel }: MemberFormProps) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up all object URLs when component unmounts
      images.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = images.length;
    const newFiles = Array.from(files);
    
    if (currentCount + newFiles.length > 5) {
      setError(`Maximum 5 images allowed. You can add ${5 - currentCount} more.`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStatus(`Processing ${newFiles.length} image(s)...`);

    try {
      const processedImages: ImageFile[] = [];

      for (const file of newFiles) {
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not a valid image file.`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} exceeds 10MB limit.`);
          continue;
        }

        const preview = URL.createObjectURL(file);
        
        try {
          const imageData = await loadImageDataFromFile(file);
          const result = await detectFaceFromImage(imageData);

          if (!result.detected || !result.faceImageData) {
            URL.revokeObjectURL(preview);
            setError(`No face detected in ${file.name}. Please upload clear face images.`);
            continue;
          }

          processedImages.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview,
            faceDetected: true,
            faceImageData: result.faceImageData,
            faceBoundingBox: result.faceBoundingBox,
          });
        } catch (err) {
          URL.revokeObjectURL(preview);
          setError(`Failed to process ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          continue;
        }
      }

      if (mountedRef.current) {
        if (processedImages.length > 0) {
          setImages(prev => {
            // Ensure we don't exceed 5 images
            const combined = [...prev, ...processedImages];
            return combined.slice(0, 5);
          });
          setProcessingStatus(`Successfully processed ${processedImages.length} image(s)`);
        } else {
          setError("No valid face images were processed. Please upload images with clear faces.");
        }
      }

    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : "Failed to process images";
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      // Revoke the object URL to avoid memory leaks
      if (newImages[index]?.preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
    setError(null);
  }, []);

  const aggregateEmbeddings = (embeddings: ArrayLike<number>[]): Float32Array => {
    if (embeddings.length === 0) return new Float32Array(128);
    
    const length = embeddings[0].length;
    const aggregated = new Float32Array(length);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < length; i++) {
        aggregated[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < length; i++) {
      aggregated[i] /= embeddings.length;
    }
    
    return aggregated;
  };

  const resetForm = useCallback(() => {
    // Clean up all object URLs before resetting
    images.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    
    setName("");
    setRelationship("");
    setEmail("");
    setPhone("");
    setNotes("");
    setImages([]);
    setSuccess(false);
    setError(null);
    setProcessingStatus("");
  }, [images]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim() || !relationship.trim()) {
        setError("Name and relationship are required.");
        return;
      }

      if (images.length < 3) {
        setError("Please upload at least 3 face images.");
        return;
      }

      const invalidImages = images.filter(img => !img.faceDetected || !img.faceImageData);
      if (invalidImages.length > 0) {
        setError(`${invalidImages.length} image(s) have no detectable face. Please remove or replace them.`);
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const embeddings: number[][] = [];
        const faceBlobs: Blob[] = [];

        for (const image of images) {
          if (image.faceImageData) {
            const embedding = generateFaceEmbedding(image.faceImageData);
            embeddings.push(embedding);
            
            const blob = await imageDataToBlob(image.faceImageData);
            faceBlobs.push(blob);
          }
        }

        const aggregateEmbedding = aggregateEmbeddings(embeddings);

        const memberInput: MemberInput = {
          name: name.trim(),
          relationship: relationship.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        };

        await createMember({ 
          input: memberInput, 
          faceEmbedding: aggregateEmbedding,
          faceImageBlob: faceBlobs[0] ?? null,
        });

        if (mountedRef.current) {
          setSuccess(true);
        }

        // Reset after delay
        setTimeout(() => {
          if (mountedRef.current) {
            resetForm();
            if (onMemberAdded) {
              onMemberAdded();
            }
          }
        }, 1500);

      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : "Failed to save member";
          setError(message);
        }
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    },
    [name, relationship, email, phone, notes, images, onMemberAdded, resetForm]
  );

  const handleCancel = useCallback(() => {
    // Clean up object URLs
    images.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    if (onCancel) {
      onCancel();
    }
  }, [images, onCancel]);

  return (
    <div className="member-form-container">
      <h3>Add New Member</h3>

      <form onSubmit={handleSubmit} className="member-form">
        <div className="form-group">
          <label htmlFor="member-name">Name *</label>
          <input
            id="member-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            required
            disabled={isSaving}
          />
        </div>

        <div className="form-group">
          <label htmlFor="member-relationship">Relationship *</label>
          <select
            id="member-relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            required
            disabled={isSaving}
          >
            <option value="">Select relationship</option>
            <option value="father">Father</option>
            <option value="mother">Mother</option>
            <option value="brother">Brother</option>
            <option value="sister">Sister</option>
            <option value="son">Son</option>
            <option value="daughter">Daughter</option>
            <option value="spouse">Spouse</option>
            <option value="grandfather">Grandfather</option>
            <option value="grandmother">Grandmother</option>
            <option value="uncle">Uncle</option>
            <option value="aunt">Aunt</option>
            <option value="cousin">Cousin</option>
            <option value="friend">Friend</option>
            <option value="colleague">Colleague</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="member-email">Email</label>
          <input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={isSaving}
          />
        </div>

        <div className="form-group">
          <label htmlFor="member-phone">Phone</label>
          <input
            id="member-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            disabled={isSaving}
          />
        </div>

        <div className="form-group">
          <label htmlFor="member-notes">Notes</label>
          <textarea
            id="member-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            disabled={isSaving}
          />
        </div>

        <div className="form-group image-upload-section">
          <label>Member Images (3-5 required)</label>
          <div className="image-upload-controls">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isProcessing || images.length >= 5 || isSaving}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || images.length >= 5 || isSaving}
              className="btn btn-secondary"
            >
              {isProcessing ? "Processing..." : "Upload Images"}
            </button>
            <span className="image-count">
              {images.length}/5 images
            </span>
          </div>
          {processingStatus && (
            <div className="processing-status">{processingStatus}</div>
          )}
        </div>

        {images.length > 0 && (
          <div className="image-gallery">
            {images.map((image, index) => (
              <div key={image.id || index} className="image-item">
                <img 
                  src={image.preview} 
                  alt={`Member face ${index + 1}`} 
                  className="thumbnail"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="remove-image-btn"
                  title="Remove image"
                  disabled={isSaving}
                >
                  ×
                </button>
                {image.faceDetected && (
                  <span className="face-detected-badge">✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Member added successfully!</div>}

        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isSaving || images.length < 3} 
            className="btn btn-primary"
          >
            {isSaving ? "Saving..." : "Save Member"}
          </button>
          {onCancel && (
            <button 
              type="button" 
              onClick={handleCancel} 
              className="btn btn-ghost"
              disabled={isSaving}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}