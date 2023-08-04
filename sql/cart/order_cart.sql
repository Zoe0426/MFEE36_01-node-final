-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:8889
-- Generation Time: Aug 04, 2023 at 12:21 AM
-- Server version: 5.7.39
-- PHP Version: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pet_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `order_cart`
--

CREATE TABLE `order_cart` (
  `cart_sid` int(11) NOT NULL COMMENT '購物車流水號',
  `member_sid` varchar(20) NOT NULL COMMENT '會員編號(GB)',
  `rel_type` varchar(20) NOT NULL COMMENT '品項類型（shop/activity）',
  `rel_sid` varchar(20) NOT NULL COMMENT '品項父編號',
  `rel_seq_sid` varchar(20) NOT NULL COMMENT '品項子編號',
  `product_qty` int(11) DEFAULT NULL COMMENT '購買數量',
  `adult_qty` int(11) DEFAULT NULL COMMENT '人數(成人)',
  `child_qty` int(11) DEFAULT NULL COMMENT '人數(小孩)',
  `order_status` varchar(20) NOT NULL COMMENT '商品狀態（001:cart,002:order,003:Delete）',
  `added_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `order_cart`
--

INSERT INTO `order_cart` (`cart_sid`, `member_sid`, `rel_type`, `rel_sid`, `rel_seq_sid`, `product_qty`, `adult_qty`, `child_qty`, `order_status`, `added_time`) VALUES
(1, 'mem00477', 'shop', 'DFFE0032', '02', 5, NULL, NULL, '001', '2023-07-08 01:05:20'),
(2, 'mem00477', 'activity', '3', '21', NULL, 1, 1, '001', '2023-07-19 10:02:23'),
(3, 'mem00477', 'activity', '2', '13', NULL, 1, 1, '001', '2023-07-09 22:55:56'),
(4, 'mem00300', 'shop', 'DFCA0004', '01', 2, NULL, NULL, '002', '2023-07-21 12:32:32'),
(5, 'mem00300', 'shop', 'CFFE0013', '02', 5, NULL, NULL, '002', '2023-07-14 17:54:50'),
(6, 'mem00300', 'activity', '1', '2', NULL, 1, 1, '001', '2023-07-08 03:56:34'),
(7, 'mem00300', 'shop', 'CGTO0009', '01', 1, NULL, NULL, '002', '2023-07-26 13:58:24'),
(8, 'mem00300', 'activity', '20', '103', NULL, 1, 2, '003', '2023-07-14 10:02:16'),
(9, 'mem00300', 'activity', '12', '65', NULL, 2, 2, '003', '2023-07-22 08:16:09'),
(10, 'mem00300', 'shop', 'CFFE0016', '02', 3, NULL, NULL, '001', '2023-07-05 11:13:56'),
(11, 'mem00300', 'activity', '3', '20', NULL, 2, 1, '003', '2023-07-21 07:21:14'),
(12, 'mem00300', 'shop', 'CFFE0003', '01', 1, NULL, NULL, '003', '2023-07-27 03:04:23'),
(13, 'mem00300', 'activity', '3', '18', NULL, 1, 1, '001', '2023-07-08 17:18:12'),
(14, 'mem00131', 'shop', 'CFFE0017', '01', 5, NULL, NULL, '001', '2023-07-23 05:17:53'),
(15, 'mem00131', 'shop', 'DFFE0020', '03', 5, NULL, NULL, '001', '2023-07-26 22:34:48'),
(16, 'mem00131', 'shop', 'DFFE0032', '04', 2, NULL, NULL, '001', '2023-07-02 01:00:21'),
(17, 'mem00131', 'activity', '9', '49', NULL, 2, 1, '001', '2023-07-21 09:17:21'),
(18, 'mem00347', 'shop', 'CFCA0015', '01', 1, NULL, NULL, '001', '2023-07-06 19:25:43'),
(19, 'mem00347', 'shop', 'DFFE0009', '01', 4, NULL, NULL, '001', '2023-07-30 21:16:33'),
(20, 'mem00347', 'shop', 'DFFE0022', '01', 3, NULL, NULL, '001', '2023-07-09 00:05:37'),
(21, 'mem00347', 'shop', 'CGTO0030', '01', 4, NULL, NULL, '001', '2023-07-13 08:38:27'),
(22, 'mem00347', 'shop', 'DFFE0012', '02', 2, NULL, NULL, '001', '2023-07-07 18:55:25'),
(23, 'mem00347', 'activity', '43', '168', NULL, 1, 2, '001', '2023-07-28 20:41:46'),
(24, 'mem00347', 'activity', '5', '35', NULL, 1, 2, '001', '2023-07-26 22:42:33'),
(25, 'mem00208', 'shop', 'DFFE0026', '02', 3, NULL, NULL, '001', '2023-07-16 03:27:28'),
(26, 'mem00208', 'shop', 'DFFE0026', '03', 4, NULL, NULL, '001', '2023-07-29 21:09:41'),
(27, 'mem00208', 'activity', '8', '46', NULL, 2, 2, '001', '2023-07-06 23:26:03'),
(28, 'mem00242', 'shop', 'CFFE0014', '02', 4, NULL, NULL, '001', '2023-07-06 05:41:13'),
(29, 'mem00242', 'shop', 'CGTO0002', '01', 3, NULL, NULL, '001', '2023-07-09 06:07:57'),
(30, 'mem00242', 'shop', 'DFFE0012', '02', 2, NULL, NULL, '001', '2023-07-26 13:36:06'),
(31, 'mem00242', 'activity', '47', '159', NULL, 1, 1, '001', '2023-07-11 01:36:38'),
(32, 'mem00242', 'activity', '27', '118', NULL, 2, 1, '001', '2023-07-05 15:14:52'),
(33, 'mem00261', 'shop', 'DFFE0001', '03', 3, NULL, NULL, '001', '2023-07-24 23:24:29'),
(34, 'mem00261', 'activity', '5', '32', NULL, 2, 1, '001', '2023-07-13 23:17:50'),
(35, 'mem00261', 'activity', '32', '129', NULL, 2, 1, '001', '2023-07-24 22:15:43'),
(36, 'mem00300', 'shop', 'CFFE0006', '01', 3, NULL, NULL, '003', '2023-07-19 17:25:04'),
(37, 'mem00300', 'shop', 'BFHE0003', '01', 5, NULL, NULL, '003', '2023-07-22 20:18:13'),
(38, 'mem00300', 'shop', 'DFFE0025', '01', 5, NULL, NULL, '003', '2023-07-23 01:15:52'),
(39, 'mem00300', 'activity', '27', '118', NULL, 2, 1, '003', '2023-07-14 17:24:40'),
(40, 'mem00300', 'activity', '39', '142', NULL, 2, 1, '001', '2023-07-03 11:15:48'),
(41, 'mem00300', 'shop', 'DGOD0009', '01', 5, NULL, NULL, '001', '2023-07-03 04:05:00'),
(42, 'mem00300', 'shop', 'DFFE0005', '01', 2, NULL, NULL, '001', '2023-07-04 10:37:36'),
(43, 'mem00300', 'shop', 'DFFE0020', '03', 2, NULL, NULL, '001', '2023-07-11 16:53:01'),
(44, 'mem00300', 'shop', 'BGOD0010', '01', 1, NULL, NULL, '003', '2023-07-13 04:32:18'),
(45, 'mem00300', 'activity', '35', '135', NULL, 1, 1, '003', '2023-07-29 20:02:26'),
(46, 'mem00300', 'shop', 'DFFE0007', '01', 1, NULL, NULL, '003', '2023-07-15 14:35:19'),
(47, 'mem00300', 'activity', '5', '34', NULL, 2, 1, '003', '2023-07-18 12:49:17'),
(48, 'mem00300', 'shop', 'DFSN0005', '01', 3, NULL, NULL, '003', '2023-07-13 20:20:27'),
(49, 'mem00300', 'shop', 'CFCA0008', '01', 4, NULL, NULL, '003', '2023-07-12 15:14:27'),
(50, 'mem00300', 'activity', '15', '77', NULL, 2, 1, '001', '2023-07-20 15:10:55'),
(51, 'mem00300', 'shop', 'DGOD0006', '01', 1, NULL, NULL, '003', '2023-08-01 00:00:00'),
(52, 'aaa', 'aaa', 'aaa', 'aaa', 1, 1, 1, '001', '2023-08-01 00:00:00'),
(53, 'mem00300', 'shop', 'DGOD0006', '02', 2, NULL, NULL, '003', '2023-08-01 21:30:12'),
(54, 'mem00300', 'activity', '1', '3', NULL, 1, 0, '003', '2023-08-01 21:30:55'),
(55, 'mem00300', 'shop', 'DFCA0002', '01', 1, NULL, NULL, '001', '2023-08-01 21:46:41');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `order_cart`
--
ALTER TABLE `order_cart`
  ADD PRIMARY KEY (`cart_sid`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `order_cart`
--
ALTER TABLE `order_cart`
  MODIFY `cart_sid` int(11) NOT NULL AUTO_INCREMENT COMMENT '購物車流水號', AUTO_INCREMENT=56;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
