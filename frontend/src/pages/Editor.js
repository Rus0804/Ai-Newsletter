import React, { useEffect, useState, useRef } from 'react';
import StudioEditor from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { canvasAbsoluteMode } from '@grapesjs/studio-sdk-plugins';
import './Editor.css'

function EditorPage() {
  const [htmlContent, setHtmlContent] = useState(null);
  const [editorReady, setEditorReady] = useState(null);
  const [filename, setFilename] = useState(localStorage.getItem('filename')==='null'? "Untitled Draft": localStorage.getItem('filename'));


  const editorRef = useRef(null);

  // Text modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [tone, setTone] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageComponent, setSelectedImageComponent] = useState(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    const func = async() => {
        await fetch('http://127.0.0.1:8000/html/output.html')
        .then(res => res.text())
        .then(setHtmlContent)
        .catch(console.error);
    }
    func()
  },[htmlContent]);

  const openModal = (component) => {
    setSelectedComponent(component);
    setTone('');
    setCustomPrompt('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedComponent(null);
  };

  const openImageModal = (component) => {
    setSelectedImageComponent(component);
    setImagePrompt('');
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImageComponent(null);
  };

  const handleTransform = async () => {
    if (!selectedComponent) return;

    const originalText = selectedComponent.view?.el?.innerText || '';
    if (!originalText.trim()) {
      alert('No text to transform.');
      return;
    }

    if (!tone) {
      alert('Please select a tone.');
      return;
    }

    if (tone === 'Custom Tone' && !customPrompt.trim()) {
      alert('Please enter a custom prompt.');
      return;
    }

    try {
      setLoading(true); // start loading

      const response = await fetch('http://127.0.0.1:8000/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          tone: tone === 'Custom Tone' ? 'Custom' : tone,
          prompt: customPrompt,
        }),
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();
      const newText = data.transformed || '[Error: Empty response]';

      selectedComponent.components([{ type: 'text', content: newText }]);
      closeModal();
    } catch (err) {
      alert('Failed to transform text: ' + err.message);
    } finally {
      setLoading(false); // stop loading
    }
  };

  const handleImageGeneration = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter an image prompt.');
      return;
    }

    try {
      setLoading(true); // start loading

      const response = await fetch('http://127.0.0.1:8000/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!response.ok) throw new Error('Image generation failed');

      const { image_base64, mime_type } = await response.json();
      const dataUrl = `data:${mime_type};base64,${image_base64}`;

      selectedImageComponent.addAttributes({ src: dataUrl });
      closeImageModal();
    } catch (err) {
      alert('Image generation error: ' + err.message);
    } finally {
      setLoading(false); // stop loading
    }
  };

  const exportToPDF = (editor) => {
  
    // Get HTML and CSS content from GrapesJS
    const htmlContent = editor.getHtml();
    const cssContent = editor.getCss();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${cssContent}</style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    fetch('http://127.0.0.1:8000/export', {
      method: 'POST',
      body: JSON.stringify({ html: fullHtml })
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to convert to PDF');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'newsletter.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Export error:', error);
        alert('❌ Could not generate PDF');
      });
  };

  const handleFilenameChange = (e) => {
    const newName = e.target.value;
    localStorage.setItem("filename", newName);
    setFilename(newName);
  };

  const handleSave = async ({ project }) => {
    const editor = editorRef.current;
    if (!editor) return;

    const htmlString = editor.getHtml();
    const cssString = editor.getCss();

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${cssString}</style>
      </head>
      <body>${htmlString}</body>
      </html>
    `;

    const token = localStorage.getItem('authToken');
    const version = parseInt(localStorage.getItem('version')) || 0;
    const projID = localStorage.getItem('projectID');

    const reqbody = {html: fullHtml, projectData: project, fname: localStorage.getItem("filename"), version: version+1, projID: projID}

    try {
      const response = await fetch('http://127.0.0.1:8000/save-draft', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reqbody),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Optional: to get more detailed backend error
        throw new Error(`Failed to send data: ${errorText}`);
      }

      const data = await response.json();

      if (data.file_id) {
        localStorage.setItem('version', version+1);
        localStorage.setItem('projectID', data.file_id);
        localStorage.setItem('projectData', JSON.stringify(project));
      } else {
        console.warn('⚠️ file_id was null or undefined');
      }
    alert('✅ Draft saved successfully!');
    
  } catch (error) {
    console.error('❌ Error while saving draft:', error);
    alert('❌ Failed to save draft. Please try again.');
  }

  };

  const handleLoad = async (editorprop) => {
    editorRef.current = editorprop.editor;
    setEditorReady(editorprop.editor)
    if(localStorage.getItem('projectID')!=='null' && localStorage.getItem('projectID')){
      const projData = JSON.parse(localStorage.getItem('projectData'))
      editorprop.editor.loadProjectData(projData)
      return projData;
    }
    editorprop.editor.loadProjectData({
      pages: [{ name: 'Edit Template', component: htmlContent }],
    })
    return {
      pages: [{ name: 'Edit Template', component: htmlContent }],
    };
  };

  return (
    <div style={{ height: '100vh' }}>
      <div className="editor-header">
        <input
          type="text"
          value={filename}
          onChange={handleFilenameChange}
          placeholder="Project Name"
          className="filename-input"
        />
        <button
          onClick={() => (editorReady && exportToPDF(editorReady))}
          className="export-button"
        >
          Export to PDF
        </button>
        <button
          onClick={() => window.location.href = "/home"}
          className="go-home-button"
        >
          Go Home
        </button>
      </div>

      {(htmlContent || localStorage.getItem('projectID')!=='null') && (<StudioEditor

        options={{
          storage: {
            type: 'self',
            autosaveChanges: 100,
            autosaveIntervalMs: 120000,
            onSave: handleSave,
            onLoad: handleLoad,
          },
          
          project: {
            default: {
              pages: [
                {
                  name: 'Home',
                  component: `
                    <div style="padding: 20px; max-width: 400px; margin: 0 auto; display: flex; flex-direction: column;">
                      <h1 style="font-size: 3rem">Heading component</h1>
                      <div style="margin: 20px 0; font-size: 2rem">Text component</div>
                      <img src="https://picsum.photos/seed/image1/300/300"/>
                    </div>
                  `,
                },
              ],
            },
          },
          plugins: [
            canvasAbsoluteMode,
            
            editor => {
              editor.Components.addType('text', {
                model: {
                  defaults: {
                    contextMenu: ({ items, component }) => [
                      ...items,
                      {
                        id: 'transformTextAI',
                        label: 'Transform Text (AI)',
                        icon: 'sparkles',
                        onClick: () => openModal(component),
                      },
                    ],
                  },
                },
              });

              editor.Components.addType('image', {
                model: {
                  defaults: {
                    contextMenu: ({ items, component }) => [
                      ...items,
                      {
                        id: 'replaceImageAI',
                        label: 'Replace Image (AI)',
                        icon: 'image',
                        onClick: () => openImageModal(component),
                      },
                    ],
                  },
                },
              });
            },
          ],
        }}
      />)}

      {/* TEXT MODAL */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={closeModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="modal-content"
          >
            <h3 style={{ margin: 0 }}>Select Tone</h3>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              style={{ padding: 8, fontSize: 16 }}
            >
              <option value="" disabled>-- Choose a tone --</option>
              <option value="Formal">Formal</option>
              <option value="Humorous">Humorous</option>
              <option value="Authoritative">Authoritative</option>
              <option value="Inspirational">Inspirational</option>
              <option value="Custom Tone">Custom Tone</option>
            </select>

            {tone === 'Custom Tone' && (
              <>
                <label htmlFor="customPrompt">Describe how to transform:</label>
                <textarea
                  id="customPrompt"
                  rows={4}
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  style={{ padding: 8, fontSize: 14, resize: 'vertical' }}
                  placeholder="Enter your custom transformation instructions"
                />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button onClick={closeModal} style={{ padding: '6px 12px' }}>
                Cancel
              </button>
              <button
                onClick={handleTransform}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: loading ? '#999' : '#4CAF50',
                  border: 'none',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                }}
              >
                {loading ? 'Generating...' : 'Transform'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE MODAL */}
      {imageModalOpen && (
        <div
          className="modal-backdrop"
          onClick={closeImageModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="modal-content"
          >
            <h3 style={{ margin: 0 }}>Enter Image Prompt</h3>
            <textarea
              rows={4}
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              style={{ padding: 8, fontSize: 14, resize: 'vertical' }}
              placeholder="Describe the image you want to generate"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button onClick={closeImageModal} style={{ padding: '6px 12px' }}>
                Cancel
              </button>
              <button
                onClick={handleImageGeneration}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: loading ? '#999' : '#4CAF50',
                  border: 'none',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  borderRadius: 4,
                }}
              >
                {loading ? 'Generating...' : 'Generate Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorPage;