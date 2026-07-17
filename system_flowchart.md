# Enrollment System Flowchart Guide

This guide contains easy-to-understand flowcharts of the JJKings Academy Enrollment System, designed for beginners or non-programmers. It maps out how a student registers, how an administrator reviews them, and how the student accesses their dashboard to pay fees.

---

## 🎨 Flowchart Symbols Key

* **([Oval])** : **Terminator** — Start or End of a process.
* **[Rectangle]** : **Process** — An action or operation performed by the system.
* **{Diamond}** : **Decision** — A decision point (Yes/No or True/False).
* **[/Parallelogram/]** : **Input/Output** — Entering data or showing/displaying info.
* **[\Trapezoid/\]** : **Manual Input** — Typing in information manually.
* **[(Cylinder)]** : **Database** — Stored data (students, schedules, payments, etc.).

---

## 🚀 1. Student Registration & Application Flow

This chart shows how a new student applies to the academy.

```mermaid
graph TD
    Start([Start]) --> HS_Type[\Choose Junior or Senior High School/\]
    HS_Type --> Info[\Type Personal & Parent Info/\]
    Info --> GradeSelect[\Select Grade Level & Strand/\]
    GradeSelect --> Submit[\Click Submit Application/\]
    Submit --> Verify{All required fields filled?}
    
    Verify -- "No" --> Toast[/Show Error Toast Alerts/]
    Toast --> Info
    
    Verify -- "Yes" --> DBWrite[(Write Pending Student Record to Database)]
    DBWrite --> Success[/Show Registration Success Alert/]
    Success --> End([Application Submitted])

    style Start fill:#f9f,stroke:#333,stroke-width:2px
    style DBWrite fill:#bbf,stroke:#333,stroke-width:2px
    style Verify fill:#fbf,stroke:#333,stroke-width:2px
    style End fill:#f9f,stroke:#333,stroke-width:2px
```

---

## 🏛️ 2. Administrative Review & Approval Flow

This chart shows how the school administrator processes pending applications.

```mermaid
graph TD
    StartAdmin([Start Review Process]) --> LoadList[(Retrieve Pending Roster from Database)]
    LoadList --> RenderList[/Display Applications on Admin Screen/]
    RenderList --> SelectStudent[\Click View Student Details/\]
    SelectStudent --> Decision{Approve or Reject?}
    
    Decision -- "Reject" --> SetReject[Set status to Rejected]
    SetReject --> DBReject[(Update Student Status in Database)]
    
    Decision -- "Approve" --> SetApprove[Set status to Approved]
    SetApprove --> AssignSection[Assign Class Section]
    AssignSection --> SetPassword[Generate Default Password: password123]
    SetPassword --> DBApprove[(Save Student Record as Approved with assigned Section)]

    DBReject --> EndAdmin([End Review Process])
    DBApprove --> EndAdmin

    style StartAdmin fill:#f9f,stroke:#333,stroke-width:2px
    style LoadList fill:#bbf,stroke:#333,stroke-width:2px
    style DBReject fill:#bbf,stroke:#333,stroke-width:2px
    style DBApprove fill:#bbf,stroke:#333,stroke-width:2px
    style Decision fill:#fbf,stroke:#333,stroke-width:2px
    style EndAdmin fill:#f9f,stroke:#333,stroke-width:2px
```

---

## 💻 3. Student Login & Tuition Payment Flow

This chart shows how an approved student logs in and pays their fees.

```mermaid
graph TD
    StartLogin([Login Start]) --> InputCreds[\Type Email and Password/\]
    InputCreds --> Auth{Check Database Credentials}
    
    Auth -- "No Match" --> Alert[/Show Invalid Password Toast/]
    Alert --> InputCreds
    
    Auth -- "Match" --> CreateSession[Create Secure Login Session]
    CreateSession --> CheckRole{Is Admin or Student?}
    
    CheckRole -- "Admin" --> RedirectAdmin[/Redirect to Admin Dashboard/]
    CheckRole -- "Student" --> CheckLevel{Is Junior or Senior High?}
    
    CheckLevel -- "Junior High" --> HideFields[Hide Semester Switcher & Voucher Card]
    HideFields --> ShowJHS[/Load JHS Schedule and Billing Info/]
    
    CheckLevel -- "Senior High" --> ShowSHS[/Load SHS Schedule, Semesters & Voucher Card/]
    
    ShowJHS --> ClickPay[\Click Pay Now & Type Credit Card info/\]
    ShowSHS --> ClickPay
    
    ClickPay --> SavePay[(Write Payment Record and reduce Outstanding Balance)]
    SavePay --> UpdateUI[/Refresh Dashboard Outstanding Balance & Transactions/]
    UpdateUI --> EndLogin([Logout / End Session])

    style StartLogin fill:#f9f,stroke:#333,stroke-width:2px
    style Auth fill:#fbf,stroke:#333,stroke-width:2px
    style CheckRole fill:#fbf,stroke:#333,stroke-width:2px
    style CheckLevel fill:#fbf,stroke:#333,stroke-width:2px
    style SavePay fill:#bbf,stroke:#333,stroke-width:2px
    style EndLogin fill:#f9f,stroke:#333,stroke-width:2px
```
