import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Award, Plus, X, Calendar, ExternalLink, Building2 } from 'lucide-react';

interface CertificationsProps {
  data: any;
  onUpdate: (data: any) => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
  neverExpires: boolean;
  description: string;
  skills: string[];
}

const POPULAR_CERTIFICATIONS = [
  // Technology
  { name: 'AWS Certified Solutions Architect', organization: 'Amazon Web Services' },
  { name: 'Google Cloud Professional Cloud Architect', organization: 'Google Cloud' },
  { name: 'Microsoft Azure Fundamentals', organization: 'Microsoft' },
  { name: 'Certified Kubernetes Administrator (CKA)', organization: 'Cloud Native Computing Foundation' },
  { name: 'Certified ScrumMaster (CSM)', organization: 'Scrum Alliance' },
  { name: 'Project Management Professional (PMP)', organization: 'Project Management Institute' },
  { name: 'Certified Information Systems Security Professional (CISSP)', organization: 'ISC2' },
  { name: 'CompTIA Security+', organization: 'CompTIA' },
  { name: 'Salesforce Administrator', organization: 'Salesforce' },
  { name: 'Certified Data Professional (CDP)', organization: 'DAMA International' },
  
  // Design & Creative
  { name: 'Adobe Certified Expert (ACE)', organization: 'Adobe' },
  { name: 'Google UX Design Certificate', organization: 'Google' },
  { name: 'HubSpot Content Marketing Certification', organization: 'HubSpot' },
  
  // Business & Finance
  { name: 'Chartered Financial Analyst (CFA)', organization: 'CFA Institute' },
  { name: 'Financial Risk Manager (FRM)', organization: 'Global Association of Risk Professionals' },
  { name: 'Six Sigma Green Belt', organization: 'Various Organizations' },
  { name: 'Certified Public Accountant (CPA)', organization: 'AICPA' },
  
  // General Professional
  { name: 'Google Analytics Individual Qualification', organization: 'Google' },
  { name: 'LinkedIn Learning Certificate', organization: 'LinkedIn' },
  { name: 'Coursera Specialization Certificate', organization: 'Coursera' }
];

export function CertificationsStep({ 
  data, 
  onUpdate, 
  onNext, 
  onPrevious, 
  isFirstStep, 
  isLastStep 
}: CertificationsProps) {
  const [formData, setFormData] = useState({
    certifications: data.certifications || [],
    ...data
  });

  const [editingCertification, setEditingCertification] = useState<Certification | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Update form data when data prop changes (for pre-population)
  // Only run once when data first arrives
  useEffect(() => {
    const newFormData = {
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      ...data
    };
    
    setFormData(newFormData);
    setIsInitialized(true);
  }, [data]);

  const emptyCertification: Certification = {
    id: '',
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
    credentialUrl: '',
    neverExpires: false,
    description: '',
    skills: []
  };

  // No auto-save - data is only saved when Continue button is clicked

  const addCertification = () => {
    setEditingCertification({ ...emptyCertification, id: Date.now().toString() });
    setShowForm(true);
    setShowSuggestions(false);
    setErrors({});
  };

  const addSuggestedCertification = (certification: typeof POPULAR_CERTIFICATIONS[0]) => {
    setEditingCertification({ 
      ...emptyCertification, 
      id: Date.now().toString(),
      name: certification.name,
      issuingOrganization: certification.organization
    });
    setShowForm(true);
    setShowSuggestions(false);
    setErrors({});
  };

  const editCertification = (certification: Certification) => {
    setEditingCertification(certification);
    setShowForm(true);
    setShowSuggestions(false);
    setErrors({});
  };

  const removeCertification = (certificationId: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).filter((cert: Certification) => cert.id !== certificationId)
    }));
  };

  const saveCertification = () => {
    if (!editingCertification || !validateCertification()) return;

    setFormData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).find((cert: Certification) => cert.id === editingCertification.id)
        ? (prev.certifications || []).map((cert: Certification) => 
            cert.id === editingCertification.id ? editingCertification : cert
          )
        : [...(prev.certifications || []), editingCertification]
    }));

    setShowForm(false);
    setEditingCertification(null);
    setErrors({});
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingCertification(null);
    setShowSuggestions(false);
    setErrors({});
  };

  const updateCertificationField = (field: keyof Certification, value: any) => {
    if (!editingCertification) return;
    
    setEditingCertification(prev => prev ? { ...prev, [field]: value } : null);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateCertification = () => {
    if (!editingCertification) return false;
    
    const newErrors: Record<string, string> = {};

    if (!editingCertification.name.trim()) {
      newErrors.name = 'Certification name is required';
    }

    if (!editingCertification.issuingOrganization.trim()) {
      newErrors.issuingOrganization = 'Issuing organization is required';
    }

    if (!editingCertification.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }

    if (!editingCertification.neverExpires && !editingCertification.expirationDate) {
      newErrors.expirationDate = 'Expiration date is required (or mark as never expires)';
    }

    if (editingCertification.issueDate && editingCertification.expirationDate && 
        new Date(editingCertification.issueDate) > new Date(editingCertification.expirationDate)) {
      newErrors.expirationDate = 'Expiration date must be after issue date';
    }

    if (editingCertification.credentialUrl && !isValidUrl(editingCertification.credentialUrl)) {
      newErrors.credentialUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validateForm = () => {
    // Certifications are optional, so no validation required
    return true;
  };

  const handleNext = async () => {
    if (validateForm()) {
      try {
        // Save data only when Continue button is clicked
        await onUpdate(formData);
        await onNext();
      } catch (error) {
        console.error('Failed to proceed to next step:', error);
      }
    }
  };

  const formatDateRange = (issueDate: string, expirationDate: string, neverExpires: boolean) => {
    const issue = new Date(issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const expiration = neverExpires ? 'No Expiration' : new Date(expirationDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${issue} - ${expiration}`;
  };

  const isExpired = (expirationDate: string, neverExpires: boolean) => {
    if (neverExpires) return false;
    return new Date(expirationDate) < new Date();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-gray-500" />
            <span>Certifications & Qualifications</span>
          </div>
        </h3>
        <p className="text-gray-600 mt-1">Add your professional certifications, licenses, and qualifications</p>
      </div>

      {/* Certifications List */}
      <div className="space-y-4">
        {(formData.certifications || []).map((certification: Certification) => (
          <div key={certification.id} className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{certification.name}</h4>
                        <p className="text-primary-600 font-medium">{certification.issuingOrganization}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateRange(certification.issueDate, certification.expirationDate, certification.neverExpires)}</span>
                          </div>
                          {certification.credentialId && (
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">ID: {certification.credentialId}</span>
                            </div>
                          )}
                        </div>
                        {!certification.neverExpires && isExpired(certification.expirationDate, certification.neverExpires) && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Expired
                            </span>
                          </div>
                        )}
                        {certification.description && (
                          <p className="mt-3 text-gray-700 leading-relaxed">
                            {certification.description}
                          </p>
                        )}
                        {certification.credentialUrl && (
                          <div className="mt-3">
                            <a 
                              href={certification.credentialUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>View Credential</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => editCertification(certification)}>
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeCertification(certification.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {(!formData.certifications || formData.certifications.length === 0) && !showForm && !showSuggestions && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No certifications added yet</h3>
            <p className="text-gray-600 mb-4">Add your professional certifications to showcase your expertise.</p>
          </div>
        )}
      </div>

      {/* Add Certification Options */}
      {!showForm && (
        <div className="space-y-3">
          <Button onClick={addCertification} className="w-full flex items-center justify-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Certification</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowSuggestions(!showSuggestions)} 
            className="w-full flex items-center justify-center space-x-2"
          >
            <Award className="w-4 h-4" />
            <span>Browse Popular Certifications</span>
          </Button>
        </div>
      )}

      {/* Popular Certifications Suggestions */}
      {showSuggestions && !showForm && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Popular Certifications</h4>
          <p className="text-gray-600 mb-4">Select from common industry certifications:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {POPULAR_CERTIFICATIONS.map((cert, index) => (
              <button
                key={index}
                onClick={() => addSuggestedCertification(cert)}
                className="text-left p-3 border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <h5 className="font-medium text-gray-900">{cert.name}</h5>
                <p className="text-sm text-gray-600">{cert.organization}</p>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShowSuggestions(false)}>
              Hide Suggestions
            </Button>
          </div>
        </div>
      )}

      {/* Certification Form */}
      {showForm && editingCertification && (
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">
            {editingCertification.id && (formData.certifications || []).find((cert: Certification) => cert.id === editingCertification.id) 
              ? 'Edit Certification' 
              : 'Add Certification'
            }
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certification Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certification Name *
              </label>
              <input
                type="text"
                value={editingCertification.name}
                onChange={(e) => updateCertificationField('name', e.target.value)}
                placeholder="e.g., AWS Certified Solutions Architect"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Issuing Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Organization *
              </label>
              <input
                type="text"
                value={editingCertification.issuingOrganization}
                onChange={(e) => updateCertificationField('issuingOrganization', e.target.value)}
                placeholder="e.g., Amazon Web Services"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.issuingOrganization ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.issuingOrganization && <p className="mt-1 text-sm text-red-600">{errors.issuingOrganization}</p>}
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editingCertification.issueDate ? editingCertification.issueDate.split('-')[1] : ''}
                  onChange={(e) => {
                    const year = editingCertification.issueDate ? editingCertification.issueDate.split('-')[0] : new Date().getFullYear().toString();
                    const month = e.target.value;
                    if (month) {
                      updateCertificationField('issueDate', `${year}-${month}`);
                    }
                  }}
                  className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.issueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Month</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <select
                  value={editingCertification.issueDate ? editingCertification.issueDate.split('-')[0] : ''}
                  onChange={(e) => {
                    const month = editingCertification.issueDate ? editingCertification.issueDate.split('-')[1] : '01';
                    const year = e.target.value;
                    if (year) {
                      updateCertificationField('issueDate', `${year}-${month}`);
                    }
                  }}
                  className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                    errors.issueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 50 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              {errors.issueDate && <p className="mt-1 text-sm text-red-600">{errors.issueDate}</p>}
            </div>

            {/* Never Expires Checkbox */}
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={editingCertification.neverExpires}
                  onChange={(e) => {
                    updateCertificationField('neverExpires', e.target.checked);
                    if (e.target.checked) {
                      updateCertificationField('expirationDate', '');
                    }
                  }}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">This certification never expires</span>
              </label>
            </div>

            {/* Expiration Date */}
            {!editingCertification.neverExpires && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editingCertification.expirationDate ? editingCertification.expirationDate.split('-')[1] : ''}
                    onChange={(e) => {
                      const year = editingCertification.expirationDate ? editingCertification.expirationDate.split('-')[0] : new Date().getFullYear().toString();
                      const month = e.target.value;
                      if (month) {
                        updateCertificationField('expirationDate', `${year}-${month}`);
                      }
                    }}
                    className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.expirationDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select
                    value={editingCertification.expirationDate ? editingCertification.expirationDate.split('-')[0] : ''}
                    onChange={(e) => {
                      const month = editingCertification.expirationDate ? editingCertification.expirationDate.split('-')[1] : '01';
                      const year = e.target.value;
                      if (year) {
                        updateCertificationField('expirationDate', `${year}-${month}`);
                      }
                    }}
                    className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      errors.expirationDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 50 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                    );
                  })}
                  </select>
                </div>
                {errors.expirationDate && <p className="mt-1 text-sm text-red-600">{errors.expirationDate}</p>}
              </div>
            )}

            {/* Credential ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential ID (Optional)
              </label>
              <input
                type="text"
                value={editingCertification.credentialId}
                onChange={(e) => updateCertificationField('credentialId', e.target.value)}
                placeholder="e.g., AWS-SAA-123456789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Credential URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credential URL (Optional)
              </label>
              <input
                type="url"
                value={editingCertification.credentialUrl}
                onChange={(e) => updateCertificationField('credentialUrl', e.target.value)}
                placeholder="https://www.credly.com/badges/..."
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.credentialUrl ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.credentialUrl && <p className="mt-1 text-sm text-red-600">{errors.credentialUrl}</p>}
              <p className="mt-1 text-sm text-gray-500">
                Link to verify your certification (e.g., Credly, Acclaim, or issuer's verification page)
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={editingCertification.description}
              onChange={(e) => updateCertificationField('description', e.target.value)}
              placeholder="Describe what this certification covers or any relevant details..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button onClick={saveCertification}>
              Save Certification
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <Button 
          variant="outline" 
          onClick={onPrevious} 
          disabled={isFirstStep}
          className="flex items-center space-x-2"
        >
          <span>Previous</span>
        </Button>

        <div className="text-center text-xs text-gray-500">
          Step 6 of 7 • Certifications
        </div>

        <Button 
          onClick={handleNext}
          className="flex items-center space-x-2"
        >
          <span>Continue</span>
        </Button>
      </div>
    </div>
  );
}