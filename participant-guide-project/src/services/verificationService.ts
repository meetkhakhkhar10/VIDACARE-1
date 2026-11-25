/**
 * verificationService.ts - Clinical Verification and Document Upload Service
 */

import { apiRequest } from './api';
import { ApiResponse, VerificationRequest } from '../types/api';

export const verificationService = {
  /**
   * Converts a File to Base64 string
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:mime/type;base64, prefix
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Submits verification request with document uploaded to Google Drive
   */
  async submitVerification(
    documentType: string,
    file?: File,
    documentLink?: string,
    remarks?: string
  ): Promise<ApiResponse<VerificationRequest>> {
    let fileBase64: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    if (file) {
      fileBase64 = await this.fileToBase64(file);
      fileName = file.name;
      mimeType = file.type || 'application/pdf';
    }

    return apiRequest<VerificationRequest>('verification_submit', {
      documentType,
      fileName,
      fileBase64,
      mimeType,
      documentLink,
      remarks
    });
  }
};
