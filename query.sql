DROP TABLE IF EXISTS SYSTEM_AUDIT_LOG CASCADE;
DROP TABLE IF EXISTS NOTIFICATION_REMINDER CASCADE;
DROP TABLE IF EXISTS EMPLOYEE_CERTIFICATION CASCADE;
DROP TABLE IF EXISTS CERTIFICATION_PROGRAM CASCADE;
DROP TABLE IF EXISTS PROVIDER CASCADE;
DROP TABLE IF EXISTS USER_ACCOUNT CASCADE;
DROP TABLE IF EXISTS EMPLOYEE CASCADE;
DROP TABLE IF EXISTS DEPARTMENT CASCADE;
DROP TABLE IF EXISTS LOCATION CASCADE;

CREATE TABLE LOCATION (
    Location_ID SERIAL PRIMARY KEY,
    Location_Name VARCHAR(100) NOT NULL,
    Region VARCHAR(50) NOT NULL
);

CREATE TABLE DEPARTMENT (
    Department_ID SERIAL PRIMARY KEY,
    Department_Name VARCHAR(100) NOT NULL,
    Location_ID INT NOT NULL REFERENCES LOCATION(Location_ID) ON DELETE RESTRICT
);

CREATE TABLE EMPLOYEE (
    Employee_ID VARCHAR(20) PRIMARY KEY,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Job_Role VARCHAR(100) NOT NULL,
    Department_ID INT NOT NULL REFERENCES DEPARTMENT(Department_ID) ON DELETE RESTRICT
);

CREATE TABLE USER_ACCOUNT (
    User_ID SERIAL PRIMARY KEY,
    Employee_ID VARCHAR(20) UNIQUE NOT NULL REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('Admin', 'HR_Staff', 'Manager'))
);

CREATE TABLE PROVIDER (
    Provider_ID SERIAL PRIMARY KEY,
    Provider_Name VARCHAR(100) NOT NULL,
    Contact_Email VARCHAR(100) NOT NULL
);

CREATE TABLE CERTIFICATION_PROGRAM (
    Certification_ID SERIAL PRIMARY KEY,
    Title VARCHAR(150) NOT NULL,
    Description TEXT,
    Validity_Months INT NOT NULL,
    Provider_ID INT NOT NULL REFERENCES PROVIDER(Provider_ID) ON DELETE RESTRICT
);

CREATE TABLE EMPLOYEE_CERTIFICATION (
    Record_ID SERIAL PRIMARY KEY,
    Employee_ID VARCHAR(20) NOT NULL REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Certification_ID INT NOT NULL REFERENCES CERTIFICATION_PROGRAM(Certification_ID) ON DELETE RESTRICT,
    Issue_Date DATE NOT NULL,
    Expiry_Date DATE NOT NULL,
    Compliance_Status VARCHAR(20) DEFAULT 'Valid' CHECK (Compliance_Status IN ('Valid', 'Expiring Soon', 'Expired')),
    CONSTRAINT chk_dates CHECK (Expiry_Date > Issue_Date)
);

CREATE TABLE NOTIFICATION_REMINDER (
    Notification_ID SERIAL PRIMARY KEY,
    Record_ID INT NOT NULL REFERENCES EMPLOYEE_CERTIFICATION(Record_ID) ON DELETE CASCADE,
    Scheduled_Date DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Sent', 'Acknowledged'))
);

CREATE TABLE SYSTEM_AUDIT_LOG (
    Audit_ID SERIAL PRIMARY KEY,
    Entity_Type VARCHAR(50) NOT NULL,
    Entity_ID VARCHAR(50) NOT NULL,
    Action_Type VARCHAR(20) NOT NULL CHECK (Action_Type IN ('INSERT', 'UPDATE', 'DELETE')),
    Action_Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Performed_By INT NOT NULL REFERENCES USER_ACCOUNT(User_ID)
);

CREATE OR REPLACE FUNCTION calculate_compliance_status()
RETURNS TRIGGER AS $$
DECLARE
    days_left INT;
BEGIN
    days_left := NEW.Expiry_Date - CURRENT_DATE;
    
    IF days_left < 0 THEN
        NEW.Compliance_Status := 'Expired';
    ELSIF days_left <= 30 THEN
        NEW.Compliance_Status := 'Expiring Soon';
    ELSE
        NEW.Compliance_Status := 'Valid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compliance_status
BEFORE INSERT OR UPDATE ON EMPLOYEE_CERTIFICATION
FOR EACH ROW EXECUTE FUNCTION calculate_compliance_status();

INSERT INTO LOCATION (Location_Name, Region) VALUES
('HITEC City Campus', 'Telangana'),
('Gachibowli Phase 2', 'Telangana'),
('Cyberabad GCC', 'Telangana'),
('Hyderabad HQ', 'Telangana');

INSERT INTO DEPARTMENT (Department_Name, Location_ID) VALUES
('AI & Machine Learning', 1),
('Data Engineering', 2),
('Infrastructure Solutions', 3),
('HR Operations', 4);

INSERT INTO EMPLOYEE (Employee_ID, First_Name, Last_Name, Email, Job_Role, Department_ID) VALUES
('EMP-1042', 'A.Roop Sri', 'Sagar', 'roop@company.com', 'AI Engineer', 1),
('EMP-1088', 'N.Ram', 'Lokesh', 'lokesh@company.com', 'Data Engineer', 2),
('EMP-1102', 'P.', 'Sputhnik', 'sputhnik@company.com', 'Systems Engineer', 3),
('EMP-0945', 'SV', 'Karthik', 'karthik@company.com', 'HR Lead', 4);

INSERT INTO USER_ACCOUNT (Employee_ID, Username, Password_Hash, Role) VALUES
('EMP-0945', 'admin@company.com', 'admin123', 'Admin');

INSERT INTO PROVIDER (Provider_Name, Contact_Email) VALUES
('Amazon Web Services', 'support@aws.com'),
('Microsoft Azure', 'support@azure.com'),
('Cisco', 'support@cisco.com'),
('SHRM', 'support@shrm.org');

INSERT INTO CERTIFICATION_PROGRAM (Title, Description, Validity_Months, Provider_ID) VALUES
('AWS Certified Machine Learning', 'Specialty ML Certification', 36, 1),
('Azure Data Engineer Associate', 'Associate Data Certification', 24, 2),
('Cisco CCNA', 'Routing and Switching Certification', 36, 3),
('SHRM Certified Professional', 'HR Professional Certification', 36, 4);

INSERT INTO EMPLOYEE_CERTIFICATION (Employee_ID, Certification_ID, Issue_Date, Expiry_Date) VALUES
('EMP-1042', 1, '2024-11-15', '2027-11-15'),
('EMP-1088', 2, '2024-08-10', '2026-08-10'),
('EMP-1102', 3, '2021-03-22', '2024-03-22'),
('EMP-0945', 4, '2025-05-30', '2028-05-30');