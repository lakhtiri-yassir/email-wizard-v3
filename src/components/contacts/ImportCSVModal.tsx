/**
 * Import CSV Modal Component
 * 
 * Multi-step wizard for importing contacts from CSV files.
 * 
 * FIXES APPLIED:
 * - Proper upsert logic with conflict resolution
 * - Email column validation
 * - Comprehensive error handling
 * - Non-fatal group assignment errors
 */

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Upload, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups: Array<{ id: string; name: string }>;
}

type Step = 'upload' | 'map' | 'group' | 'review';

interface CSVRow {
  [key: string]: string;
}

const FIELD_MAPPINGS = {
  email: ['email', 'e-mail', 'mail', 'email address'],
  first_name: ['first name', 'firstname', 'first', 'fname'],
  last_name: ['last name', 'lastname', 'last', 'lname'],
  company: ['company', 'organization', 'org', 'business'],
  role: ['role', 'title', 'job title', 'position'],
  industry: ['industry', 'sector', 'field']
};

export const ImportCSVModal = ({ isOpen, onClose, onSuccess, groups }: ImportCSVModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    // Validate file type
    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[];
        
        if (data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        setCSVData(data);

        if (data.length > 0) {
          const detectedHeaders = Object.keys(data[0]);
          setHeaders(detectedHeaders);

          // Auto-detect column mappings
          const autoMapping: Record<string, string> = {};
          detectedHeaders.forEach(header => {
            const lowerHeader = header.toLowerCase().trim();
            Object.entries(FIELD_MAPPINGS).forEach(([field, variations]) => {
              if (variations.some(v => lowerHeader.includes(v))) {
                autoMapping[header] = field;
              }
            });
          });
          
          setColumnMapping(autoMapping);
          setStep('map');
          toast.success(`Loaded ${data.length} rows from CSV`);
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file. Please check the file format.');
      }
    });
  };

  const handleImport = async () => {
    if (!user) {
      toast.error('You must be logged in to import contacts');
      return;
    }

    setImporting(true);

    try {
      // Step 1: Create new group if needed
      let groupId = selectedGroupId;
      if (!groupId && newGroupName.trim()) {
        try {
          const { data: newGroup, error: groupError } = await supabase
            .from('contact_groups')
            .insert({
              user_id: user.id,
              name: newGroupName.trim(),
              description: `Created during CSV import on ${new Date().toLocaleDateString()}`
            })
            .select()
            .single();

          if (groupError) {
            console.error('Group creation error:', groupError);
            throw new Error(`Failed to create group: ${groupError.message}`);
          }

          groupId = newGroup.id;
          toast.success(`Created new group: ${newGroupName}`);
        } catch (error: any) {
          toast.error(error.message || 'Failed to create group');
          setImporting(false);
          return;
        }
      }

      // Step 2: Prepare contacts for import
      const contacts = csvData
        .map(row => {
          const mappedRow: any = { 
            user_id: user.id, 
            status: 'active' 
          };

          // Map CSV columns to database fields
          Object.entries(columnMapping).forEach(([csvCol, dbField]) => {
            const value = row[csvCol]?.trim();
            if (value) {
              mappedRow[dbField] = value;
            }
          });

          return mappedRow;
        })
        .filter(contact => contact.email); // Only include rows with email

      // Validate that we have contacts to import
      if (contacts.length === 0) {
        toast.error('No valid contacts found. Ensure CSV has an email column with valid data.');
        setImporting(false);
        return;
      }

      console.log(`Preparing to import ${contacts.length} contacts...`);

      // Step 3: Insert contacts with proper upsert logic
      try {
        const { data: insertedContacts, error: contactError } = await supabase
          .from('contacts')
          .upsert(contacts, { 
            onConflict: 'user_id,email',
            ignoreDuplicates: false // Update existing records instead of ignoring
          })
          .select();

        if (contactError) {
          console.error('Contact insert error:', contactError);
          throw new Error(`Failed to import contacts: ${contactError.message}`);
        }

        if (!insertedContacts || insertedContacts.length === 0) {
          throw new Error('No contacts were imported. They may already exist.');
        }

        console.log(`Successfully imported ${insertedContacts.length} contacts`);
        toast.success(`Imported ${insertedContacts.length} contacts successfully!`);

        // Step 4: Add to group if specified (non-fatal)
        if (groupId && insertedContacts && insertedContacts.length > 0) {
          try {
            const groupMembers = insertedContacts.map(contact => ({
              contact_id: contact.id,
              group_id: groupId
            }));

            const { error: memberError } = await supabase
              .from('contact_group_members')
              .upsert(groupMembers, { 
                onConflict: 'contact_id,group_id',
                ignoreDuplicates: true // Don't fail on existing memberships
              });

            if (memberError) {
              console.error('Group membership error:', memberError);
              // Non-fatal - contacts were still imported successfully
              toast.warning('Contacts imported but some group assignments failed');
            } else {
              console.log(`Added ${insertedContacts.length} contacts to group`);
            }
          } catch (error) {
            console.warn('Could not add contacts to group:', error);
            // Non-fatal error
          }
        }

        // Step 5: Success - clean up and close
        resetModal();
        onSuccess();
        onClose();

      } catch (error: any) {
        console.error('Import error:', error);
        toast.error(error.message || 'Failed to import contacts');
      }

    } catch (error: any) {
      console.error('Import process error:', error);
      toast.error(error.message || 'An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setCSVData([]);
    setHeaders([]);
    setColumnMapping({});
    setSelectedGroupId('');
    setNewGroupName('');
  };

  const handleCloseModal = () => {
    if (!importing) {
      resetModal();
      onClose();
    }
  };

  // Validate email column is mapped
  const isEmailMapped = Object.values(columnMapping).includes('email');

  // Calculate valid rows
  const validRows = csvData.filter(row => {
    const emailColumn = Object.keys(columnMapping).find(k => columnMapping[k] === 'email');
    return emailColumn && row[emailColumn]?.trim();
  }).length;

  const invalidRows = csvData.length - validRows;

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="Import Contacts from CSV" maxWidth="2xl">
      <div className="p-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {(['upload', 'map', 'group', 'review'] as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold ${
                step === s ? 'border-gold bg-gold text-black' :
                ['upload', 'map', 'group', 'review'].indexOf(step) > idx ? 'border-green-500 bg-green-500 text-white' :
                'border-gray-300 text-gray-400'
              }`}>
                {['upload', 'map', 'group', 'review'].indexOf(step) > idx ? <Check size={16} /> : idx + 1}
              </div>
              {idx < 3 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  ['upload', 'map', 'group', 'review'].indexOf(step) > idx ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a CSV file containing your contacts. The file should include at least an email column.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gold transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer">
                <span className="text-gold font-medium hover:text-yellow-600">
                  Click to upload
                </span>
                <span className="text-gray-600"> or drag and drop</span>
              </label>
              <p className="text-sm text-gray-500 mt-2">CSV files only</p>
            </div>

            {file && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800">
                  ✓ File loaded: {file.name}
                </p>
                <p className="text-sm text-green-600">
                  {csvData.length} rows found
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Map Columns</h3>
              <p className="text-sm text-gray-600 mb-4">
                Match your CSV columns to contact fields. Email is required.
              </p>
            </div>

            <div className="space-y-3">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    <span className="text-sm font-medium">{header}</span>
                  </div>
                  <ArrowRight className="text-gray-400" size={20} />
                  <select
                    value={columnMapping[header] || ''}
                    onChange={(e) => setColumnMapping(prev => ({
                      ...prev,
                      [header]: e.target.value
                    }))}
                    className="flex-1 input-base"
                  >
                    <option value="">Don't import</option>
                    <option value="email">Email *</option>
                    <option value="first_name">First Name</option>
                    <option value="last_name">Last Name</option>
                    <option value="company">Company</option>
                    <option value="role">Role</option>
                    <option value="industry">Industry</option>
                  </select>
                </div>
              ))}
            </div>

            {!isEmailMapped && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800">⚠ Email column is required</p>
                <p className="text-sm text-red-600">Please map at least one column to Email</p>
              </div>
            )}
          </div>
        )}

        {step === 'group' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Group (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add imported contacts to a group
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="groupOption"
                  checked={!selectedGroupId && !newGroupName}
                  onChange={() => {
                    setSelectedGroupId('');
                    setNewGroupName('');
                  }}
                  className="w-4 h-4"
                />
                <span>Don't add to any group</span>
              </label>

              {groups.length > 0 && (
                <div>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer mb-2">
                    <input
                      type="radio"
                      name="groupOption"
                      checked={!!selectedGroupId}
                      onChange={() => {
                        setNewGroupName('');
                        if (groups.length > 0) {
                          setSelectedGroupId(groups[0].id);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span>Add to existing group</span>
                  </label>
                  {selectedGroupId && (
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="input-base ml-7 w-[calc(100%-28px)]"
                    >
                      <option value="">Select a group</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="groupOption"
                    checked={!!newGroupName}
                    onChange={() => {
                      setSelectedGroupId('');
                      setNewGroupName('New Group');
                    }}
                    className="w-4 h-4"
                  />
                  <span>Create new group</span>
                </label>
                {newGroupName !== '' && (
                  <Input
                    type="text"
                    placeholder="Enter new group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="ml-7 w-[calc(100%-28px)]"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review Import</h3>
              <p className="text-sm text-gray-600 mb-4">
                Confirm your import details before proceeding
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total rows in CSV:</span>
                <span className="text-sm font-semibold">{csvData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Valid contacts (with email):</span>
                <span className="text-sm font-semibold text-green-600">{validRows}</span>
              </div>
              {invalidRows > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Invalid rows (no email):</span>
                  <span className="text-sm font-semibold text-red-600">{invalidRows}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Will be added to group:</span>
                <span className="text-sm font-semibold">
                  {selectedGroupId 
                    ? groups.find(g => g.id === selectedGroupId)?.name 
                    : newGroupName || 'None'}
                </span>
              </div>
            </div>

            {invalidRows > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠ {invalidRows} row{invalidRows > 1 ? 's' : ''} will be skipped because they don't have an email address.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
          <div>
            {step !== 'upload' && (
              <Button
                variant="secondary"
                onClick={() => {
                  const steps: Step[] = ['upload', 'map', 'group', 'review'];
                  const currentIndex = steps.indexOf(step);
                  if (currentIndex > 0) {
                    setStep(steps[currentIndex - 1]);
                  }
                }}
                icon={ArrowLeft}
                disabled={importing}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="tertiary"
              onClick={handleCloseModal}
              disabled={importing}
            >
              Cancel
            </Button>
            
            {step === 'upload' && (
              <Button
                variant="primary"
                onClick={() => setStep('map')}
                disabled={!file || csvData.length === 0}
                icon={ArrowRight}
              >
                Next
              </Button>
            )}
            
            {step === 'map' && (
              <Button
                variant="primary"
                onClick={() => setStep('group')}
                disabled={!isEmailMapped}
                icon={ArrowRight}
              >
                Next
              </Button>
            )}
            
            {step === 'group' && (
              <Button
                variant="primary"
                onClick={() => setStep('review')}
                icon={ArrowRight}
              >
                Next
              </Button>
            )}
            
            {step === 'review' && (
              <Button
                variant="primary"
                onClick={handleImport}
                loading={importing}
                disabled={importing || validRows === 0}
              >
                {importing ? 'Importing...' : `Import ${validRows} Contact${validRows !== 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};