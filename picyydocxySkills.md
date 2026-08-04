# SKILL: Standard Documentation Generator for AI Agents

## Overview & Purpose
ทักษะ (Skill) นี้มีไว้สำหรับกำหนดมาตรฐานและแนวทางการเขียนเอกสาร (Documentation Guidelines) ให้กับ AI Agent (เช่น Gemini, Claude, ChatGPT, Cursor, Windsurf ฯลฯ) เพื่อให้เอกสารที่สร้างขึ้นมีความสมบูรณ์ สื่อสารชัดเจน ละเอียดครบถ้วนทุกขั้นตอน โดยไม่ข้ามขั้นตอน แม้จะเป็นรายละเอียดเล็กน้อย และมีโครงสร้างการจัดเก็บที่เป็นระบบ

---

## 1. กฎการตั้งชื่อไฟล์ (File Naming Convention)

ชื่อไฟล์ `.md` ทุกไฟล์ต้องปฏิบัติตามรูปแบบดังต่อไปนี้:

```text
[document_id]_[topic_name]_[priority]_[YYYYMMDD_HHMM]_[related_module].md
```

### คำอธิบายองค์ประกอบ:

* **`[document_id]`**: รหัสเอกสาร เช่น `DOC-001`, `BUG-042`, `FEAT-012`, `SYS-003`
* **`[topic_name]`**: หัวข้อหรือชื่อเรื่องของเนื้อหา ใช้ภาษาอังกฤษแบบ kebab-case หรือ snake_case เช่น `auth-system-setup`
* **`[priority]`**: ลำดับความสำคัญของเอกสาร ได้แก่ `P0-CRITICAL`, `P1-HIGH`, `P2-MEDIUM`, `P3-LOW`
* **`[YYYYMMDD_HHMM]`**: วันและเวลาที่สร้าง/อัปเดตเอกสาร เช่น `20260804_1000`
* **`[related_module]`**: ส่วนงานหรือโมดูลที่เกี่ยวข้อง เช่น `backend-auth`, `frontend-ui`, `infra-proxmox`

### ตัวอย่างชื่อไฟล์:

* `DOC-001_nginx-reverse-proxy-setup_P1-HIGH_20260804_1000_infra-network.md`
* `BUG-015_auth-token-expired-handling_P0-CRITICAL_20260804_1030_backend-api.md`
* `FEAT-008_bento-grid-dashboard-ui_P2-MEDIUM_20260804_1100_frontend-react.md`

---

## 2. โครงสร้างเนื้อหาภายในไฟล์ (Internal File Structure)

เนื้อหาภายในเอกสาร Markdown ต้องเรียงลำดับตามส่วนประกอบมาตรฐาน 5 ส่วนหลัก ดังนี้:

### ส่วนที่ 1: ประเภทเอกสารและคำอธิบายภาพรวม (Document Type & Summary)

ต้องระบุชนิดของเอกสารให้ชัดเจนที่สุดในส่วนหัวของไฟล์ โดยเลือกประเภทดังต่อไปนี้ (หรือระบุประเภทเฉพาะทางอื่น):

* **เอกสารรายงานบั๊ก (Bug Report)**
* **เอกสารแผนผังระบบ / สถาปัตยกรรม (System Architecture / Diagram)**
* **เอกสารรายงานอัปเดต (Status Update Report)**
* **เอกสารส่งมอบงาน (Handoff Document)**
* **เอกสารอธิบายฟังก์ชัน / API (Function / API Spec)**
* **เอกสารบันทึกช่วยจำ (Note / Knowledge Base)**
* **เอกสารข้อกำหนดฟีเจอร์ (Feature Specification)**
* **เอกสารคลังไลบรารี / ไลบรารีภายนอก (Library Specification)**
* **เอกสารการจัดการตามติดการติดตั้ง (Dependency Management)**
* **เอกสารคู่มือการทำงาน (How-To Guide)**
* **เอกสารคู่มือผู้ใช้ / ผู้ดูแลระบบ (Manual / User Guide)**

### ส่วนที่ 2: ขอบเขตและหลักการเขียน (Writing Guidelines & Constraints)

* **One File, One Topic (1 เรื่อง ต่อ 1 ไฟล์):** ห้ามรวมหลายหัวข้อที่ต่างบริบทกันไว้ในไฟล์เดียว หากมีเนื้อหาแยกย่อยมาก ให้สร้างไฟล์ใหม่แล้วใช้อ้างอิง (Cross-reference)
* **Step-by-Step & Zero Omission:** ต้องเขียนขั้นตอนโดยละเอียดแบบจับมือทำ (Step-by-step) ห้ามข้ามขั้นตอนเด็ดขาด
* **Full Command & Code Inclusion:** ทุกคำสั่ง CLI, เมนู UI ที่ต้องคลิก, การตั้งค่า Configuration หรือ Source Code แม้เพียง 1 บรรทัด ต้องระบุไว้ครบถ้วน ห้ามใช้คำว่า `...` หรือ `// code goes here` หรือข้ามโค้ดส่วนสำคัญ

---

## 3. แม่แบบเอกสาร Markdown (Standard Template)

AI Agent ต้องใช้ Template ด้านล่างนี้ในการสร้างเอกสารเสมอ:

````markdown
# [รหัสเอกสาร] [ชื่อหัวข้อเอกสาร]

> **ประเภทเอกสาร (Document Type):** [ระบุประเภท เช่น เอกสารคู่มือการทำงาน (How-To Guide), เอกสารส่งมอบงาน (Handoff)]  
> **วันเวลาอัปเดตล่าสุด:** YYYY-MM-DD HH:MM:SS  
> **ระดับความสำคัญ (Priority):** P0-CRITICAL / P1-HIGH / P2-MEDIUM / P3-LOW  

---

## 1. ภาพรวมและวัตถุประสงค์ (Overview & Objectives)
[อธิบายเนื้อหาโดยสรุปว่าเอกสารนี้เกี่ยวกับอะไร มีจุดประสงค์เพื่ออะไร และใครเป็นกลุ่มเป้าหมายผู้อ่าน]

---

## 2. สิ่งที่ต้องเตรียมก่อนเริ่ม (Prerequisites / Dependencies)
* [สิ่งที่ต้องมี เครื่องมือที่ต้องติดตั้ง หรือสิทธิ์ที่ต้องใช้]
* [ตัวอย่าง: Node.js v20.x, Docker v24.x, สิทธิ์ Root บน Ubuntu Server]

---

## 3. ขั้นตอนการปฏิบัติงานโดยละเอียด (Detailed Step-by-Step Instructions)

### ขั้นตอนที่ 1: [ชื่อขั้นตอนแรก]
1.1 อธิบายรายละเอียดสิ่งที่ต้องทำ...
1.2 เปิด Terminal/Command Prompt แล้วรันคำสั่งต่อไปนี้:
```bash
sudo apt update && sudo apt upgrade -y
```
1.3 เข้าไปยังเมนู `Settings` -> `Network` -> `Interfaces`

### ขั้นตอนที่ 2: [ชื่อขั้นตอนที่สอง]
2.1 แก้ไขไฟล์การตั้งค่าที่ path `/etc/nginx/sites-available/default` โดยเพิ่มโค้ดดังนี้:
```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
2.2 ตรวจสอบความถูกต้องของคอนฟิกด้วยคำสั่ง:
```bash
sudo nginx -t
```
2.3 ทำการ reload บริการ Nginx:
```bash
sudo systemctl reload nginx
```

---

## 4. โฟลเดอร์และไฟล์โปรเจกต์ที่เกี่ยวข้อง (Related Project Folders & Files)

mark พาทของโฟลเดอร์และไฟล์ที่เกี่ยวข้องในโปรเจกต์ไว้เพื่อการอ้างอิง:

* 📁 `/src/backend/controllers/auth.controller.ts` (ไฟล์จัดการ Logic การยืนยันตัวตน)
* 📁 `/src/frontend/components/bento/BentoGrid.tsx` (Component แสดงผล UI)
* 📁 `/config/nginx/proxy.conf` (ไฟล์ตั้งค่า Reverse Proxy)
* 📁 `/docs/architecture/` (โฟลเดอร์เก็บเอกสารสถาปัตยกรรมระบบ)

---

## 5. ข้อมูลผู้เขียนและเครื่องมือที่ใช้ (Author & Tool Metadata)

* **ผู้เขียน (Author):** [ระบุชื่อผู้สร้าง/รับผิดชอบ เช่น Pichayut Somboon / AI Assistant]
* **เครื่องมือ/โมเดล AI (AI Model/Tool):** [เช่น Gemini 1.5 Pro, Claude 3.5 Sonnet, ChatGPT-4o]
* **Agent Framework/Tooling:** [เช่น Cursor IDE, Windsurf, Claude Code, Custom LangChain Agent]
````

---

## 4. ตัวอย่างเอกสารสมบูรณ์ (Complete Document Example)

````markdown
# DOC-001 Nginx Reverse Proxy Multi-Port Setup

> **ประเภทเอกสาร (Document Type):** เอกสารคู่มือการทำงาน (How-To Guide)  
> **วันเวลาอัปเดตล่าสุด:** 2026-08-04 10:00:00  
> **ระดับความสำคัญ (Priority):** P1-HIGH  

---

## 1. ภาพรวมและวัตถุประสงค์ (Overview & Objectives)
เอกสารนี้เป็นคู่มือสำหรับการตั้งค่า Nginx ให้ทำหน้าที่เป็น Reverse Proxy เพื่อรวมการเชื่อมต่อจากหลาย พอร์ต (Internal Ports) บน Ubuntu Server ให้ออกผ่าน พอร์ต 80/443 และเชื่อมต่อเข้ากับ Firewall NAT

---

## 2. สิ่งที่ต้องเตรียมก่อนเริ่ม (Prerequisites / Dependencies)
* Ubuntu 22.04 LTS Server
* สิทธิ์ Root หรือ Sudo user
* Nginx v1.18+

---

## 3. ขั้นตอนการปฏิบัติงานโดยละเอียด (Detailed Step-by-Step Instructions)

### ขั้นตอนที่ 1: การติดตั้ง Nginx
1.1 ทำการอัปเดตดัชนีแพ็กเกจของระบบ:
```bash
sudo apt update
```
1.2 ติดตั้ง Nginx ด้วยคำสั่ง:
```bash
sudo apt install nginx -y
```

### ขั้นตอนที่ 2: การสร้าง Config File สำหรับ Reverse Proxy
2.1 สร้างไฟล์คอนฟิกใหม่ใน `/etc/nginx/sites-available/app-proxy.conf`:
```bash
sudo nano /etc/nginx/sites-available/app-proxy.conf
```
2.2 ใส่เนื้อหาการตั้งค่าดังนี้ลงในไฟล์:
```nginx
server {
    listen 80;
    server_name localhost;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /web/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
2.3 บันทึกไฟล์ (ใน nano กด `Ctrl+O`, `Enter`, และ `Ctrl+X`)

### ขั้นตอนที่ 3: เปิดใช้งาน คอนฟิก และทดสอบ
3.1 สร้าง Symbolic Link เพื่อเปิดใช้งาน คอนฟิก:
```bash
sudo ln -s /etc/nginx/sites-available/app-proxy.conf /etc/nginx/sites-enabled/
```
3.2 ตรวจสอบ Syntax ของ Nginx:
```bash
sudo nginx -t
```
3.3 รีสตาร์ทบริการ Nginx:
```bash
sudo systemctl restart nginx
```

---

## 4. โฟลเดอร์และไฟล์โปรเจกต์ที่เกี่ยวข้อง (Related Project Folders & Files)

* 📁 `/etc/nginx/sites-available/app-proxy.conf` (ไฟล์การตั้งค่าหลัก)
* 📁 `/etc/nginx/sites-enabled/app-proxy.conf` (Link การเปิดใช้งาน)
* 📁 `/var/log/nginx/access.log` (ไฟล์ Log การเข้าถึง)
* 📁 `/var/log/nginx/error.log` (ไฟล์ Log ข้อผิดพลาด)

---

## 5. ข้อมูลผู้เขียนและเครื่องมือที่ใช้ (Author & Tool Metadata)

* **ผู้เขียน (Author):** AI Assistant
* **เครื่องมือ/โมเดล AI (AI Model/Tool):** Gemini
* **Agent Framework/Tooling:** Gemini Chat Agent
````
