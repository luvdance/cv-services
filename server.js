require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 4000; // 

const SELECTPDF_API_KEY = process.env.SELECTPDF_API_KEY; // 
const SELECTPDF_API_URL = "https://selectpdf.com/api2/convert/";

app.use(cors({ origin: "https://www.memorasmart.com/cv.html" }));
app.use(bodyParser.json({ limit: "10mb" }));

// Helper function to sanitize text for HTML
function sanitize(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return (value || '').toString().replace(/\s+/g, ' ').trim();
}

// Helper function to build the complete, styled HTML string
function buildHtmlContent(cvData) {
  const p = cvData.personal;
  const template = (cvData.template || 'classic').toLowerCase(); // Extract the template name
  const cssStyles = `
    body{ font-family:system-ui,Segoe UI,Roboto,Inter,Arial,sans-serif; background:white; color:#111827; margin:0; padding:40px;}
    .resume{ line-height:1.35; max-width:800px; margin:auto; }
    .resume h1{font-size:26px; margin:0 0 6px;}
    .resume .section{margin-top:14px;}
    .resume .section h2{ font-size:14px; letter-spacing:.6px; text-transform:uppercase; color:#111827; border-bottom:1px solid #111827; padding-bottom:6px; margin:0 0 8px;}
    .resume .item{margin:8px 0;}
    .resume .item .top{display:flex; justify-content:space-between; gap:8px; font-weight:600;}
    .resume .item .sub{font-size:12px; color:#374151;}
    .resume ul{margin:6px 0 0 18px; padding:0;}
    .resume li{margin:3px 0;}
    .resume .skills .chips{display:flex; flex-wrap:wrap; gap:8px;}
    .chip{border:1px solid #d1d5db; padding:4px 8px; border-radius:999px; font-size:12px;}
    
    .contact {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        font-size: 14px;
    }
    .contact i {
        margin-right: 6px;
        color: #1f2937;
    }
    .contact > * {
        display: flex;
        align-items: center;
    }
    .separator {
        margin: 0 10px;
        color: #d1d5db;
    }

    /* ===== Templates ===== */
    .template-classic h1 { font-family: "Georgia", "Times New Roman", serif; }
.template-classic h2 { font-family: "Georgia", "Times New Roman", serif; }

.template-modern { padding-top: 0px; }
.template-modern h1 { letter-spacing: .3px; }
.template-modern .section h2 { border-bottom: 2px solid #111827; }
.template-modern .item .top { color: #0f172a; }
.template-modern .accent {
    height: 6px;
    background: #111827;
    margin: 0 0 16px;
    border-radius: 10px 10px 0 0;
}

.template-minimal {
    background: #f9fafb;
    padding: 20px;
    border-radius: 8px;
}
.template-minimal h1 { color: #111827; font-weight: 600; }
.template-minimal .section h2 {
    border: none;
    background: #e5e7eb;
    color: #374151;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
    letter-spacing: .5px;
}
.template-minimal .sub { color: #6b7280; }
.template-minimal .chip {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
}
  `;

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <style>${cssStyles}</style>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    </head>
    <body>
        <div class="resume template-${template}">
    	${template === 'modern' ? '<div class="accent"></div>' : ''}
            <h1>${sanitize(p.name) || 'Your Name'}</h1>
            <div class="sub" style="font-weight:500; color:#1f2937; margin-bottom:4px;">${sanitize(p.title)}</div>
            <div class="contact">
                ${p.email ? `<span><i class="fas fa-envelope"></i> ${sanitize(p.email)}</span>` : ''}
                ${p.phone ? `<span><span class="separator">|</span><i class="fas fa-phone"></i> ${sanitize(p.phone)}</span>` : ''}
                ${p.location ? `<span><span class="separator">|</span><i class="fas fa-map-marker-alt"></i> ${sanitize(p.location)}</span>` : ''}
                ${p.links ? `<span><span class="separator">|</span><i class="fas fa-link"></i> ${sanitize(p.links)}</span>` : ''}
            </div>
            
            ${cvData.summary ? `
                <div class="section"><h2>Summary</h2><div>${sanitize(cvData.summary)}</div></div>
            ` : ''}

            ${cvData.skills?.length ? `
                <div class="section skills"><h2>Skills</h2><div class="chips">${cvData.skills.map(s => `<span class="chip">${s}</span>`).join('')}</div></div>
            ` : ''}

            ${cvData.work?.length ? `
                <div class="section"><h2>Experience</h2>${cvData.work.map(w => `
                    <div class="item">
                        <div class="top">
                            <div>${sanitize(w.role)}${w.company ? ' · ' + sanitize(w.company) : ''}</div>
                            <div>${sanitize(w.start)}${w.end ? ' – ' + sanitize(w.end) : ' – Present'}</div>
                        </div>
                        <div class="sub">${[w.location, w.employmentType].filter(Boolean).map(sanitize).join(' · ')}</div>
                        ${w.points && w.points.length ? `<ul>${w.points.map(pt => `<li>${pt}</li>`).join('')}</ul>` : ''}
                    </div>
                `).join('')}</div>
            ` : ''}

            ${cvData.projects?.length ? `
                <div class="section"><h2>Projects</h2>${cvData.projects.map(pr => `
                    <div class="item">
                        <div class="top">
                            <div>${sanitize(pr.name)}</div>
                            <div>${sanitize(pr.year || '')}</div>
                        </div>
                        <div class="sub">${sanitize(pr.link || '')}</div>
                        ${pr.points && pr.points.length ? `<ul>${pr.points.map(pt => `<li>${pt}</li>`).join('')}</ul>` : ''}
                    </div>
                `).join('')}</div>
            ` : ''}

            ${cvData.education?.length ? `
                <div class="section"><h2>Education</h2>${cvData.education.map(e => `
                    <div class="item">
                        <div class="top">
                            <div>${sanitize(e.degree)}${e.school ? ' · ' + sanitize(e.school) : ''}</div>
                            <div>${sanitize(e.start)}${e.end ? ' – ' + sanitize(e.end) : ''}</div>
                        </div>
                        <div class="sub">${sanitize(e.location || '')}</div>
                        ${e.details ? `<div style="margin-top:6px;">${sanitize(e.details)}</div>` : ''}
                    </div>
                `).join('')}</div>
            ` : ''}

            ${cvData.certifications?.length ? `
                <div class="section"><h2>Certifications</h2>${cvData.certifications.map(c => `
                    <div class="item">
                        <div class="top">
                            <div>${sanitize(c.name)}</div>
                            <div>${sanitize(c.year || '')}</div>
                        </div>
                        <div class="sub">${sanitize(c.issuer || '')}</div>
                    </div>
                `).join('')}</div>
            ` : ''}

            ${cvData.languages?.length ? `
                <div class="section"><h2>Languages</h2><div>${sanitize(cvData.languages)}</div></div>
            ` : ''}
        </div>
    </body>
    </html>
  `;
  return htmlContent;
}

// Test route
app.get("/ping", (req, res) => {
  res.json({ message: "Server is alive ✅" });
});


// PDF export route
app.post("/export", async (req, res) => {
  const cvData = req.body;
  try {
    const htmlContent = buildHtmlContent(cvData);
    const response = await axios.post(SELECTPDF_API_URL, {
      key: SELECTPDF_API_KEY,
      html: htmlContent,
      pageSize: "A4",
      pageOrientation: "Portrait",
    }, {
      responseType: 'arraybuffer'
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
    res.send(response.data);

  } catch (err) {
    console.error("❌ PDF generation error:", err.response ? err.response.data.toString() : err.message);
    res.status(500).send("Failed to generate PDF");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
