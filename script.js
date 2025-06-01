// Helper functions for predictions and recommendations
async function analyzeAudio(audioBlob) {
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const fileReader = new FileReader();

        fileReader.onload = async function() {
            try {
                const arrayBuffer = this.result;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                // Get audio data
                const channelData = audioBuffer.getChannelData(0);
                const bufferLength = channelData.length;
                const sampleRate = audioBuffer.sampleRate;

                // 1. Analyze tremor (variation in amplitude)
                let tremor = 0;
                let previousAmplitude = Math.abs(channelData[0]);
                for (let i = 1; i < bufferLength; i++) {
                    const currentAmplitude = Math.abs(channelData[i]);
                    tremor += Math.abs(currentAmplitude - previousAmplitude);
                    previousAmplitude = currentAmplitude;
                }
                tremor = (tremor / bufferLength) * 1000; // Normalize tremor value

                // 2. Analyze pitch stability
                let pitchStability = 0;
                const samples = 1024;
                for (let i = 0; i < bufferLength - samples; i += samples) {
                    const slice = channelData.slice(i, i + samples);
                    const sum = slice.reduce((a, b) => a + Math.abs(b), 0);
                    pitchStability += sum / samples;
                }
                pitchStability = Math.max(0, 1 - (pitchStability / (bufferLength / samples)));

                // 3. Analyze speech rate
                let crossings = 0;
                for (let i = 1; i < bufferLength; i++) {
                    if ((channelData[i] * channelData[i - 1]) < 0) crossings++;
                }
                const speechRate = crossings / (bufferLength / sampleRate);

                // 4. Analyze voice breaks
                let voiceBreaks = 0;
                const silenceThreshold = 0.01;
                let inSilence = false;
                for (let i = 0; i < bufferLength; i++) {
                    const amplitude = Math.abs(channelData[i]);
                    if (!inSilence && amplitude < silenceThreshold) {
                        voiceBreaks++;
                        inSilence = true;
                    } else if (inSilence && amplitude >= silenceThreshold) {
                        inSilence = false;
                    }
                }
                const voiceBreakRate = voiceBreaks / (bufferLength / sampleRate);

                // 5. Calculate final prediction based on multiple parameters
                const tremorScore = Math.min(10, tremor * 50); // Max 10 points for tremor
                const pitchScore = Math.min(10, (1 - pitchStability) * 50); // Max 10 points for pitch instability
                const speechRateScore = Math.min(5, Math.abs(3 - speechRate) * 5); // Max 5 points for speech rate deviation
                const voiceBreakScore = Math.min(5, voiceBreakRate * 10); // Max 5 points for voice breaks

                // Calculate total score (max 30 points)
                let prediction;
                if (audioBlob.type === 'audio/webm') {
                    // For recorded audio, cap at 20%
                    prediction = Math.min(20, 
                        (tremorScore + pitchScore + speechRateScore + voiceBreakScore) * (20/30)
                    );
                } else {
                    // For uploaded audio, use full range
                    prediction = Math.min(100, 
                        (tremorScore + pitchScore + speechRateScore + voiceBreakScore) * (100/30)
                    );
                }

                console.log('Audio Analysis Results:', {
                    tremorScore: tremorScore.toFixed(2),
                    pitchScore: pitchScore.toFixed(2),
                    speechRateScore: speechRateScore.toFixed(2),
                    voiceBreakScore: voiceBreakScore.toFixed(2),
                    tremor: tremor.toFixed(3),
                    pitchStability: pitchStability.toFixed(3),
                    speechRate: speechRate.toFixed(3),
                    voiceBreaks: voiceBreaks,
                    voiceBreakRate: voiceBreakRate.toFixed(3),
                    prediction: prediction.toFixed(2)
                });

                resolve(prediction);
            } catch (error) {
                console.error('Error in audio analysis:', error);
                reject(error);
            }
        };

        fileReader.onerror = function() {
            reject(new Error('Failed to read audio file'));
        };

        fileReader.readAsArrayBuffer(audioBlob);
    });
}

function calculateHealthPrediction(data) {
    // Calculate SpO2 impact (lower SpO2 increases risk)
    const spO2Impact = data.spO2 < 95 ? (95 - data.spO2) * 5 : 0;
    
    // Calculate calories impact (lower calories may indicate reduced movement)
    const caloriesImpact = data.caloriesBurnt < 2000 ? (2000 - data.caloriesBurnt) * 0.015 : 0;
    
    return Math.min(100, Math.max(0,
        (spO2Impact + caloriesImpact + data.muscleStiffness * 10 +
            Math.abs(80 - data.heartRate) * 0.5 +
            (data.age > 55 ? 20 : 0) +
            (data.stepCount < 5000 ? 15 : 0) +
            (data.sleep < 6 ? 10 : 0)) / 5
    ));
}

function getRecommendations(prediction) {
    if (prediction < 30) {
        return [
            "Exercise: 30-60 min of aerobic exercise (walking, cycling, swimming) & strength training 3-4x/week",
            "Diet: Mediterranean diet (rich in antioxidants, omega-3, whole grains, fruits, and vegetables)",
            "Sleep: 7-8 hours of quality sleep, avoid caffeine/alcohol before bed",
            "Stress Management: Yoga, meditation, and social engagement to reduce anxiety",
            "Medical Monitoring: Regular neurologist checkups, track symptoms with a wearable device",
            "Supplements: Consult a doctor about vitamin D, B12, and coenzyme Q10 for neuroprotection",
            "Note: This assessment is for screening purposes only and should not be considered a medical diagnosis. Please consult with a healthcare professional for proper medical evaluation."
        ];
    } else if (prediction < 60) {
        return [
            "Exercise: Physical therapy + daily walking, stretching, balance exercises, tai chi",
            "Diet: High-protein meals timed correctly (protein can interfere with some medications)",
            "Sleep: Improve sleep hygiene, use weighted blankets, and consider melatonin if needed",
            "Medication: Start Parkinson's meds as prescribed, monitor for side effects",
            "Fall Prevention: Use handrails, non-slip mats, and supportive shoes",
            "Cognitive Health: Engage in brain-stimulating activities (reading, puzzles, learning new skills)",
            "Note: This assessment is for screening purposes only and should not be considered a medical diagnosis. Please consult with a healthcare professional for proper medical evaluation."
        ];
    } else {
        return [
            "Physical Therapy: Daily mobility exercises, assistive devices (walkers, handrails, wheelchair if needed)",
            "Diet: Soft foods (if swallowing is difficult), high-fiber diet to prevent constipation",
            "Sleep Management: Adjustable beds, nighttime movement assistance, melatonin for sleep regulation",
            "Medication Adjustment: Monitor effectiveness of levodopa and adjust doses with a neurologist",
            "Speech Therapy: Work on voice strength and swallowing exercises",
            "Caregiver Support: Daily assistance with movement, hygiene, and emotional support",
            "Note: This assessment is for screening purposes only and should not be considered a medical diagnosis. Please consult with a healthcare professional for proper medical evaluation."
        ];
    }
}

function getSeverityLevel(prediction) {
    if (prediction < 30) return { level: "Low Risk", class: "severity-low" };
    if (prediction < 60) return { level: "Moderate Risk", class: "severity-moderate" };
    return { level: "High Risk", class: "severity-high" };
}

// Navigation functions
function showSection(sectionId) {
    // Update section visibility
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Scroll to top when changing sections
    window.scrollTo(0, 0);
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        showSection(sectionId);
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function goBack() {
    showSection('assessments');
}

function showVoiceAnalysis() {
    showSection('voiceAnalysis');
}

function showHealthForm() {
    showSection('healthForm');
}

// Voice recording functionality
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let audioBlob = null;

// Theme toggle functionality
function toggleTheme() {
    document.body.classList.toggle('dark');
    // Use sessionStorage instead of localStorage
    sessionStorage.setItem('darkMode', document.body.classList.contains('dark'));
}

// Initialize theme from sessionStorage
function initTheme() {
    if (sessionStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
    }
}

// Auth form handling
// User authentication handling
class Auth {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    }

    register(username, email, password) {
        // Check if user already exists
        if (this.users.find(user => user.email === email)) {
            throw new Error('User already exists');
        }

        // Create new user
        const user = {
            id: Date.now().toString(),
            username,
            email,
            password: this.hashPassword(password), // In a real app, use proper password hashing
            createdAt: new Date().toISOString(),
            assessments: []
        };

        this.users.push(user);
        localStorage.setItem('users', JSON.stringify(this.users));
        return user;
    }

    login(email, password) {
        const user = this.users.find(u => u.email === email);
        if (!user || user.password !== this.hashPassword(password)) {
            throw new Error('Invalid credentials');
        }

        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // Simple password hashing (for demo purposes only)
    // In a real application, use proper password hashing like bcrypt
    hashPassword(password) {
        return btoa(password); // Base64 encoding (NOT secure for production)
    }

    addAssessment(assessment) {
        if (!this.currentUser) return;
        
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex === -1) return;

        this.users[userIndex].assessments.push({
            ...assessment,
            date: new Date().toISOString()
        });

        this.currentUser = this.users[userIndex];
        localStorage.setItem('users', JSON.stringify(this.users));
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    getAssessments() {
        return this.currentUser?.assessments || [];
    }
}

// Initialize auth
const auth = new Auth();

// Auth UI handling
function showAuthSection(section) {
    document.querySelectorAll('.auth-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        auth.register(username, email, password);
        auth.login(email, password);
        showSection('home');
        updateAuthUI();
    } catch (error) {
        alert(error.message);
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        auth.login(email, password);
        showSection('home');
        updateAuthUI();
    } catch (error) {
        alert(error.message);
    }
}

function handleLogout() {
    auth.logout();
    showSection('login');
    updateAuthUI();
}

function updateAuthUI() {
    const user = auth.getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');

    if (user) {
        authButtons.classList.add('hidden');
        userInfo.classList.remove('hidden');
        document.getElementById('userName').textContent = user.username;
    } else {
        authButtons.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }
}

// Initialize auth UI
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    
    // Add event listeners
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
    
    // Show login by default if not authenticated
    if (!auth.isAuthenticated()) {
        showSection('login');
    }
}); 

// Initialize voice recording when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    showSection('home');
    
    // Theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Auth forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Voice recording elements
    const recordButton = document.getElementById('recordButton');
    const uploadInput = document.getElementById('audioUpload');
    const recordingProgress = document.getElementById('recordingProgress');
    const audioPreview = document.getElementById('audioPreview');
    const audioPlayer = document.getElementById('audioPlayer');
    const submitRecording = document.getElementById('submitRecording');

    if (recordButton) {
        recordButton.addEventListener('click', async () => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            audioChunks.push(e.data);
                        }
                    };

                    mediaRecorder.onstop = () => {
                        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const audioUrl = URL.createObjectURL(audioBlob);

                        // Show audio preview
                        if (audioPlayer) {
                            audioPlayer.src = audioUrl;
                        }
                        if (audioPreview) {
                            audioPreview.classList.remove('hidden');
                        }
                    };

                    mediaRecorder.start();
                    recordButton.textContent = 'Stop Recording';
                    if (recordingProgress) {
                        recordingProgress.classList.remove('hidden');
                    }
                    if (audioPreview) {
                        audioPreview.classList.add('hidden');
                    }

                    let progress = 0;
                    recordingInterval = setInterval(() => {
                        progress += 2;
                        if (progress >= 100) {
                            stopRecording();
                        } else {
                            const progressFill = recordingProgress?.querySelector('.progress-fill');
                            if (progressFill) {
                                progressFill.style.width = `${progress}%`;
                            }
                        }
                    }, 100);

                } catch (err) {
                    alert('Please allow microphone access to record your voice');
                    console.error('Microphone access error:', err);
                }
            } else {
                stopRecording();
            }
        });
    }

    if (submitRecording) {
        submitRecording.addEventListener('click', async () => {
            if (audioBlob) {
                try {
                    const prediction = await analyzeAudio(audioBlob);
                    showResults('voice', prediction);
                } catch (error) {
                    console.error('Error analyzing audio:', error);
                    alert('Error analyzing audio. Please try again.');
                }
            }
        });
    }

    if (uploadInput) {
        uploadInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const audioUrl = URL.createObjectURL(file);
                if (audioPlayer) {
                    audioPlayer.src = audioUrl;
                }
                if (audioPreview) {
                    audioPreview.classList.remove('hidden');
                }
                audioBlob = file;
            }
        });
    }

    // Health form handling
    const healthForm = document.getElementById('healthAssessmentForm');
    if (healthForm) {
        healthForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = {
                age: parseInt(document.getElementById('age')?.value || 0),
                heartRate: parseInt(document.getElementById('heartRate')?.value || 0),
                spO2: parseInt(document.getElementById('spO2')?.value || 0),
                muscleStiffness: parseFloat(document.getElementById('muscleStiffness')?.value || 0),
                caloriesBurnt: parseInt(document.getElementById('caloriesBurnt')?.value || 0),
                sleep: parseFloat(document.getElementById('sleep')?.value || 0),
                stepCount: parseInt(document.getElementById('stepCount')?.value || 0),
            };

            const prediction = calculateHealthPrediction(formData);
            showResults('health', prediction);
        });
    }

    // Range input value display
    document.querySelectorAll('input[type="range"]').forEach(range => {
        const valueDisplay = range.parentElement.querySelector('.range-value');
        if (valueDisplay) {
            valueDisplay.textContent = range.value;
            range.addEventListener('input', () => {
                valueDisplay.textContent = range.value;
            });
        }
    });
});

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingInterval);

        const recordButton = document.getElementById('recordButton');
        const recordingProgress = document.getElementById('recordingProgress');
        const progressFill = recordingProgress?.querySelector('.progress-fill');

        if (recordButton) {
            recordButton.textContent = 'Start Recording';
        }
        if (recordingProgress) {
            recordingProgress.classList.add('hidden');
        }
        if (progressFill) {
            progressFill.style.width = '0%';
        }
    }
}

// Results display
function showResults(type, prediction) {
    console.log('Showing results:', { type, prediction });
    const severity = getSeverityLevel(prediction);
    const recommendations = getRecommendations(prediction);
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const predictionValue = document.getElementById('predictionValue');
    const severityLevel = document.getElementById('severityLevel');
    const recommendationsList = document.getElementById('recommendationsList');
    const assessmentDate = document.getElementById('assessmentDate');

    if (predictionValue) {
        predictionValue.textContent = `${prediction.toFixed(2)}%`;
        predictionValue.className = severity.class;
    }

    if (severityLevel) {
        severityLevel.textContent = severity.level;
        severityLevel.className = severity.class;
    }

    if (recommendationsList) {
        recommendationsList.innerHTML = recommendations
            .map(rec => `<li>${rec}</li>`)
            .join('');
    }

    if (assessmentDate) {
        assessmentDate.textContent = date;
    }

    showSection('results');
}

// Report generation
function downloadReport() {
    try {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF library not loaded. Please make sure jsPDF is included in your project.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const predictionElement = document.getElementById('predictionValue');
        const severityElement = document.getElementById('severityLevel');
        const recommendationsElement = document.getElementById('recommendationsList');
        const dateElement = document.getElementById('assessmentDate');

        if (!predictionElement || !severityElement || !recommendationsElement || !dateElement) {
            alert('Report data not available. Please complete an assessment first.');
            return;
        }

        const prediction = parseFloat(predictionElement.textContent);
        const severity = severityElement.textContent;
        const recommendations = Array.from(recommendationsElement.children)
            .map(li => li.textContent.replace(/^Note:.*$/, '').trim())
            .filter(rec => rec.length > 0);
        const date = dateElement.textContent;
        const reportId = `PD${Date.now().toString().slice(-6)}`;

        // Layout constants
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 40;
        const contentWidth = pageWidth - (2 * margin);
        const sectionSpacing = 32;
        const boxSpacing = 18;
        const lineHeight = 18;
        const accentBarWidth = 7;

        // Colors
        const headerColor = [41, 128, 185]; // #2980b9
        const accentColor = [41, 128, 185]; // #2980b9
        const bgColor = [245, 245, 245]; // subtle gray
        const sectionBgColor = [255, 255, 255];
        const borderColor = [200, 200, 200]; // #c8c8c8
        const dividerColor = [220, 220, 220];
        const riskColors = {
            'High Risk': [231, 76, 60],      // Red
            'Moderate Risk': [243, 156, 18],// Orange/Yellow
            'Low Risk': [46, 204, 113]      // Green
        };
        const riskTextColors = {
            'High Risk': [255,255,255],
            'Moderate Risk': [0,0,0],
            'Low Risk': [255,255,255]
        };

        // Create PDF and set background
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        doc.setFillColor(...bgColor);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Watermark
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({opacity: 0.08}));
        doc.setFontSize(70);
        doc.setTextColor(41, 128, 185);
        doc.text('ParkinsonCare', pageWidth/2, pageHeight/2, {angle: 35, align: 'center'});
        doc.restoreGraphicsState();

        // Header Section
        doc.setFillColor(...headerColor);
        doc.rect(0, 0, pageWidth, 100, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("Parkinson's Disease Assessment Center", margin, 40);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Advanced Neurological Assessment Division', margin, 60);

        // Move the report border and title further down
        const reportSectionTop = 130;
        // Accent bar for section
        doc.setFillColor(...accentColor);
        doc.rect(margin - accentBarWidth - 3, reportSectionTop, accentBarWidth, 90, 'F');
        // Section background
        doc.setFillColor(...sectionBgColor);
        doc.rect(margin, reportSectionTop, contentWidth, 90, 'F');
        // Section border
        doc.setDrawColor(...headerColor);
        doc.setLineWidth(2);
        doc.rect(margin, reportSectionTop, contentWidth, 40);
        // Section title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DIAGNOSTIC ASSESSMENT REPORT', margin, reportSectionTop + 30);
        // Section details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Report Date: ${date}`, margin, reportSectionTop + 60);
        doc.text(`Report ID: ${reportId}`, margin + 260, reportSectionTop + 60);
        doc.text('Assessment Type: Combined Analysis (Voice & Health Metrics)', margin, reportSectionTop + 80);
        // Divider
        doc.setDrawColor(...dividerColor);
        doc.setLineWidth(1);
        doc.line(margin, reportSectionTop + 95, margin + contentWidth, reportSectionTop + 95);

        // Risk Assessment Section
        let yPos = reportSectionTop + 120;
        let riskBg = riskColors[severity] || [200,200,200];
        let riskFg = riskTextColors[severity] || [0,0,0];
        const riskBoxHeight = 90;
        // Accent bar
        doc.setFillColor(...riskBg);
        doc.rect(margin - accentBarWidth - 3, yPos - 30, accentBarWidth, riskBoxHeight + 40, 'F');
        // Fill the entire risk assessment results section with the risk color
        doc.setFillColor(...riskBg);
        doc.rect(margin, yPos - 30, contentWidth, riskBoxHeight + 40, 'F');
        // Section Title
        doc.setTextColor(...riskFg);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('RISK ASSESSMENT RESULTS', margin + 10, yPos - 10);
        // Risk Details Box (white background inside colored section)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(1);
        doc.rect(margin + 10, yPos, contentWidth - 20, riskBoxHeight, 'FD');
        // Risk Classification Label
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Risk Classification:', margin + 25, yPos + 30);
        // Risk Classification Value (colored background)
        doc.setFillColor(...riskBg);
        doc.setTextColor(...riskFg);
        doc.rect(margin + 170, yPos + 15, 120, 28, 'F');
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(severity, margin + 175, yPos + 35, { baseline: 'middle' });
        // Assessment Score
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Assessment Score:', margin + 25, yPos + 60);
        doc.setFont('helvetica', 'normal');
        doc.text(`${prediction.toFixed(2)}%`, margin + 170, yPos + 60);
        // Divider
        doc.setDrawColor(...dividerColor);
        doc.setLineWidth(1);
        doc.line(margin, yPos + riskBoxHeight + 15, margin + contentWidth, yPos + riskBoxHeight + 15);

        // Clinical Recommendations Section
        yPos += riskBoxHeight + 40 + sectionSpacing;
        // Accent bar
        doc.setFillColor(...accentColor);
        doc.rect(margin - accentBarWidth - 3, yPos - 30, accentBarWidth, 30 + (recommendations.length * 40), 'F');
        // Section background
        doc.setFillColor(...sectionBgColor);
        doc.rect(margin, yPos - 30, contentWidth, 30, 'F');
        doc.setTextColor(...accentColor);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('CLINICAL RECOMMENDATIONS', margin + 10, yPos - 10);
        // Recommendations List
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        recommendations.forEach((rec, index) => {
            const recBoxHeight = Math.max(40, Math.ceil(doc.splitTextToSize(rec, contentWidth - 40).length * lineHeight * 0.9));
            doc.setFillColor(...bgColor);
            doc.rect(margin, yPos, contentWidth, recBoxHeight, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('•', margin + 10, yPos + 25);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(rec, contentWidth - 40);
            doc.text(lines, margin + 25, yPos + 25);
            yPos += recBoxHeight + boxSpacing;
            if (yPos > 750) {
                doc.addPage();
                yPos = 60;
            }
        });
        // Divider
        doc.setDrawColor(...dividerColor);
        doc.setLineWidth(1);
        doc.line(margin, yPos, margin + contentWidth, yPos);
        // Disclaimer
        yPos += 10;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const disclaimer = "Note: This assessment is for screening purposes only and should not be considered a medical diagnosis. Please consult with a healthcare professional for proper medical evaluation.";
        const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
        doc.text(disclaimerLines, margin, yPos);
        yPos += disclaimerLines.length * lineHeight + 10;

        // Footer with page number
        const footerY = 820;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('© 2025 ParkinsonCare. All rights reserved.', margin, footerY);
        doc.text('Confidential - For Medical Use Only', pageWidth - margin - 200, footerY);
        doc.text(`Page 1 of 1`, pageWidth / 2, footerY, { align: 'center' });

        // Save the PDF
        doc.save(`PD-Assessment-${reportId}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating report. Please try again.');
    }
}