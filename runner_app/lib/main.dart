import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const RunnerApp());
}

class RunnerApp extends StatelessWidget {
  const RunnerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '2 Roti Runner',
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.orange,
        scaffoldBackgroundColor: const Color(0xFF111111),
      ),
      home: const MainScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const ScannerScreen(),
    const ZoneListScreen(zoneName: 'Buddha'),
    const ZoneListScreen(zoneName: 'KIPM'),
    const ZoneListScreen(zoneName: 'ITM'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.black,
        selectedItemColor: Colors.orange,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.qr_code_scanner), label: 'Scanner'),
          BottomNavigationBarItem(icon: Icon(Icons.location_on), label: 'Buddha'),
          BottomNavigationBarItem(icon: Icon(Icons.location_on), label: 'KIPM'),
          BottomNavigationBarItem(icon: Icon(Icons.location_on), label: 'ITM'),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// Scanner Screen
// -------------------------------------------------------------
class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController cameraController = MobileScannerController();
  bool isProcessing = false;

  void handleBarcode(BarcodeCapture capture) async {
    if (isProcessing) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null && barcode.rawValue!.startsWith('#2R-')) {
        setState(() => isProcessing = true);
        cameraController.stop();
        
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderVerifyScreen(
              orderToken: barcode.rawValue!,
              cameraController: cameraController,
            ),
          ),
        );
        
        setState(() => isProcessing = false);
        cameraController.start();
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR to Deliver'),
        backgroundColor: Colors.black,
      ),
      body: MobileScanner(
        controller: cameraController,
        onDetect: handleBarcode,
      ),
    );
  }
}

// -------------------------------------------------------------
// Zone List Screen
// -------------------------------------------------------------
class ZoneListScreen extends StatefulWidget {
  final String zoneName;
  const ZoneListScreen({super.key, required this.zoneName});

  @override
  State<ZoneListScreen> createState() => _ZoneListScreenState();
}

class _ZoneListScreenState extends State<ZoneListScreen> {
  final String baseUrl = 'https://doroti.shop';
  List<dynamic> orders = [];
  bool isLoading = true;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    fetchOrders();
    timer = Timer.periodic(const Duration(seconds: 15), (_) => fetchOrders());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> fetchOrders() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/runner/active-orders'));
      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['success'] == true) {
        if (!mounted) return;
        final allOrders = data['orders'] as List<dynamic>;
        
        setState(() {
          orders = allOrders.where((o) => 
            o['location_name'].toString().toLowerCase().contains(widget.zoneName.toLowerCase())
          ).toList();
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.zoneName} Deliveries'),
        backgroundColor: Colors.black,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => isLoading = true);
              fetchOrders();
            },
          )
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : orders.isEmpty
              ? const Center(child: Text('No active deliveries for this zone.'))
              : ListView.builder(
                  padding: const EdgeInsets.all(10),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    return Card(
                      color: Colors.grey.shade900,
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text(
                          order['customer_name'] ?? 'Unknown',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order['customer_phone'] ?? 'No Phone'),
                            Text(
                              order['order_token'],
                              style: const TextStyle(color: Colors.orange, fontSize: 12),
                            ),
                          ],
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: order['order_status'] == 'READY' ? Colors.blue.shade900 : Colors.purple.shade900,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            order['order_status'] == 'READY' ? 'READY' : 'ON WAY',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                        onTap: () {
                          // Allow them to manually enter OTP if they don't want to scan QR
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => OrderVerifyScreen(
                                orderToken: order['order_token'],
                                cameraController: null,
                              ),
                            ),
                          ).then((_) => fetchOrders());
                        },
                      ),
                    );
                  },
                ),
    );
  }
}

// -------------------------------------------------------------
// Order Verify Screen
// -------------------------------------------------------------
class OrderVerifyScreen extends StatefulWidget {
  final String orderToken;
  final MobileScannerController? cameraController;

  const OrderVerifyScreen({
    super.key,
    required this.orderToken,
    this.cameraController,
  });

  @override
  State<OrderVerifyScreen> createState() => _OrderVerifyScreenState();
}

class _OrderVerifyScreenState extends State<OrderVerifyScreen> {
  final String baseUrl = 'https://doroti.shop';
  Map<String, dynamic>? orderDetails;
  bool isLoading = true;
  String errorMsg = '';
  final TextEditingController otpController = TextEditingController();
  bool isSubmitting = false;

  @override
  void initState() {
    super.initState();
    fetchOrderDetails();
  }

  Future<void> fetchOrderDetails() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/api/runner/order/${widget.orderToken}'));
      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['success'] == true) {
        setState(() {
          orderDetails = data['order'];
          isLoading = false;
        });
      } else {
        setState(() {
          errorMsg = data['message'] ?? 'Order not found';
          isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        errorMsg = 'Network error fetching order.';
        isLoading = false;
      });
    }
  }

  Future<void> verifyOtp() async {
    final otp = otpController.text.trim();
    if (otp.length != 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a 4-digit OTP')),
      );
      return;
    }

    setState(() => isSubmitting = true);

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/runner/order/${widget.orderToken}/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'otp': otp}),
      );
      final data = jsonDecode(res.body);

      if (res.statusCode == 200 && data['success'] == true) {
        if (!mounted) return;
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (_) => AlertDialog(
            backgroundColor: Colors.green.shade900,
            title: const Text('Success!', style: TextStyle(color: Colors.white)),
            content: const Text('Order delivered successfully.', style: TextStyle(color: Colors.white)),
            actions: [
              TextButton(
                child: const Text('OK', style: TextStyle(color: Colors.white)),
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Go back
                },
              )
            ],
          ),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Invalid OTP!'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error.'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => isSubmitting = false);
    }
  }

  @override
  void dispose() {
    otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Fetching...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (errorMsg.isNotEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Error')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(errorMsg, style: const TextStyle(color: Colors.red, fontSize: 18)),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              )
            ],
          ),
        ),
      );
    }

    final order = orderDetails!;

    return Scaffold(
      appBar: AppBar(
        title: Text(order['order_token']),
        backgroundColor: Colors.black,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade900,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Deliver To:', style: TextStyle(color: Colors.grey.shade400)),
                  const SizedBox(height: 4),
                  Text(order['customer_name'] ?? 'Unknown', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Location: ${order['location_name']}', style: const TextStyle(fontSize: 16)),
                  if (order['customer_phone'] != null) ...[
                    const SizedBox(height: 4),
                    Text('Phone: ${order['customer_phone']}', style: const TextStyle(fontSize: 16)),
                  ],
                  const Divider(height: 30),
                  Text('Payment:', style: TextStyle(color: Colors.grey.shade400)),
                  Text(
                    '${order['payment_source'].toString().toUpperCase()} - ${order['payment_status']}',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: order['payment_status'] == 'PAID' ? Colors.green : Colors.orange,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
            if (order['order_status'] == 'DELIVERED')
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.green.shade900.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.green),
                ),
                child: const Center(
                  child: Text(
                    'ALREADY DELIVERED',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green),
                  ),
                ),
              )
            else ...[
              const Text('Ask Customer for 4-Digit OTP:', style: TextStyle(fontSize: 16)),
              const SizedBox(height: 10),
              TextField(
                controller: otpController,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 32, letterSpacing: 8, fontWeight: FontWeight.bold),
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  counterText: "",
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange.shade700,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: isSubmitting ? null : verifyOtp,
                  child: isSubmitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('VERIFY OTP & COMPLETE DELIVERY', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
