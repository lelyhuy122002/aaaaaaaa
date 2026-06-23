IF DB_ID(N'BlankupDB') IS NULL
BEGIN
  CREATE DATABASE [BlankupDB];
END
GO

USE [BlankupDB];
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
CREATE TABLE dbo.Users (
  id          NVARCHAR(50)   PRIMARY KEY,
  username    NVARCHAR(100)  NOT NULL UNIQUE,
  password    NVARCHAR(255)  NULL,
  fullName    NVARCHAR(200)  NOT NULL,
  email       NVARCHAR(255)  NULL,
  avatar      NVARCHAR(500)  NULL,
  provider    NVARCHAR(20)   NOT NULL DEFAULT 'local',
  providerId  NVARCHAR(255)  NULL,
  role        NVARCHAR(20)   NOT NULL DEFAULT 'user',
  createdAt   DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
CREATE TABLE dbo.Orders (
  orderId         NVARCHAR(50)   PRIMARY KEY,
  designUrl       NVARCHAR(MAX)  NULL,
  productType     NVARCHAR(50)   NOT NULL,
  color           NVARCHAR(20)   DEFAULT '#ffffff',
  size            NVARCHAR(10)   NOT NULL,
  quantity        INT            NOT NULL DEFAULT 1,
  price           INT            NOT NULL DEFAULT 200000,
  customerName    NVARCHAR(200)  NOT NULL,
  customerPhone   NVARCHAR(50)   NOT NULL,
  customerAddress NVARCHAR(500)  NOT NULL,
  customerNote    NVARCHAR(500)  NULL,
  payment         NVARCHAR(20)   DEFAULT 'COD',
  status          NVARCHAR(20)   DEFAULT 'pending',
  userId          NVARCHAR(50)   NULL,
  authorName      NVARCHAR(200)  DEFAULT 'Guest',
  createdAt       DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

IF OBJECT_ID(N'dbo.Designs', N'U') IS NULL
CREATE TABLE dbo.Designs (
  id          NVARCHAR(50)   PRIMARY KEY,
  prompt      NVARCHAR(500)  NULL,
  promptEn    NVARCHAR(500)  NULL,
  style       NVARCHAR(50)   NULL,
  designUrl   NVARCHAR(MAX)  NULL,
  author      NVARCHAR(200)  DEFAULT 'Guest',
  likes       INT            DEFAULT 0,
  createdAt   DATETIME       NOT NULL DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE id = N'u-admin')
BEGIN
  INSERT INTO dbo.Users (id, username, password, fullName, role, provider, createdAt)
  VALUES
    (N'u-admin', N'admin', N'admin123', N'System Admin', N'admin', N'local', '2026-06-01T12:00:00.000'),
    (N'u-1', N'minht', N'password123', N'Minh T.', N'user', N'local', '2026-06-15T08:30:00.000'),
    (N'u-2', N'ann', N'password123', N'An N.', N'user', N'local', '2026-06-16T14:20:00.000'),
    (N'u-3', N'huongl', N'password123', N'Hương L.', N'user', N'local', '2026-06-17T09:15:00.000');
END
GO
