import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

const String kBaseUrl = 'https://www.doroti.shop';

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
      final code = barcode.rawValue?.trim();
      if (code != null && code.isNotEmpty) {
        setState(() => isProcessing = true);
        cameraController.stop();

        String token = code;
        String? secretOtp;
        String? custName;

        try {
          if (code.startsWith('{')) {
            final parsed = jsonDecode(code);
            token = parsed['token']?.toString() ?? token;
            secretOtp = parsed['secret']?.toString() ?? parsed['otp']?.toString();
            custName = parsed['customer']?.toString();
          }
        } catch (_) {}
        
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OrderVerifyScreen(
              orderToken: token,
              initialOtp: secretOtp,
              scannedCustomerName: custName,
              cameraController: cameraController,
            ),
          ),
        );
        
        if (mounted) {
          setState(() => isProcessing = false);
          cameraController.start();
        }
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
      final res = await http.get(Uri.parse('$kBaseUrl/api/runner/active-orders'));
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

  Future<void> _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
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
                  padding: const EdgeInsets.all(12),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    final order = orders[index];
                    final String customerName = order['customer_name'] ?? 'Unknown Customer';
                    final String customerPhone = order['customer_phone'] ?? '';
                    final String otp = order['delivery_otp']?.toString() ?? '----';
                    final List<dynamic> items = order['items'] as List<dynamic>? ?? [];

                    return Card(
                      color: const Color(0xFF1C1C1C),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.grey.shade800),
                      ),
                      margin: const EdgeInsets.only(bottom: 14),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header: Customer Name (Bold & Large) + Status Badge
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    customerName,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: order['order_status'] == 'READY'
                                        ? Colors.blue.shade900
                                        : Colors.purple.shade900,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    order['order_status'] ?? 'ON WAY',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),

                            // Order Token
                            Text(
                              order['order_token'] ?? '',
                              style: const TextStyle(
                                color: Colors.orange,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 10),

                            // Prominent Phone Number with Visual Call Button
                            Row(
                              children: [
                                const Icon(Icons.phone, size: 16, color: Colors.grey),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    customerPhone.isNotEmpty ? customerPhone : 'No Phone Provided',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                ),
                                if (customerPhone.isNotEmpty)
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.call, size: 16, color: Colors.white),
                                    label: const Text('Call', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.green.shade700,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                    onPressed: () => _makePhoneCall(customerPhone),
                                  ),
                              ],
                            ),
                            const Divider(height: 22, color: Colors.white24),

                            // Prominent 4-Digit OTP Box
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.indigo.shade950,
                                borderRadius: BorderRadius.circular(10),
                                border: BorderSide(color: Colors.indigo.shade700),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'DELIVERY OTP:',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.indigoAccent,
                                      letterSpacing: 1,
                                    ),
                                  ),
                                  Text(
                                    otp,
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.black,
                                      letterSpacing: 4,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Order items
                            if (items.isNotEmpty) ...[
                              const Text(
                                'Order Items:',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                              ),
                              const SizedBox(height: 4),
                              ...items.map((it) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 2),
                                child: Text(
                                  '• ${it['quantity']}x ${it['item_name']}',
                                  style: const TextStyle(fontSize: 13, color: Colors.white70),
                                ),
                              )),
                              const SizedBox(height: 12),
                            ],

                            // Verify Delivery Action Button
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.orange.shade800,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: () {
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
                                child: const Text(
                                  'Verify OTP / Mark Delivered',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
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
  final String? initialOtp;
  final String? scannedCustomerName;
  final MobileScannerController? cameraController;

  const OrderVerifyScreen({
    super.key,
    required this.orderToken,
    this.initialOtp,
    this.scannedCustomerName,
    this.cameraController,
  });

  @override
  State<OrderVerifyScreen> createState() => _OrderVerifyScreenState();
}

class _OrderVerifyScreenState extends State<OrderVerifyScreen> {
  Map<String, dynamic>? orderDetails;
  bool isLoading = true;
  String errorMsg = '';
  final TextEditingController otpController = TextEditingController();
  bool isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialOtp != null && widget.initialOtp!.isNotEmpty) {
      otpController.text = widget.initialOtp!;
    }
    fetchOrderDetails();
  }

  Future<void> fetchOrderDetails() async {
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/runner/order/${widget.orderToken}'));
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

  Future<void> _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
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
        Uri.parse('$kBaseUrl/api/runner/order/${widget.orderToken}/verify-otp'),
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
      if (mounted) {
        setState(() => isSubmitting = false);
      }
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
    final String customerName = order['customer_name'] ?? 'Unknown Customer';
    final String? customerPhone = order['customer_phone'];

    return Scaffold(
      appBar: AppBar(
        title: Text(order['order_token'] ?? 'Order Details'),
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
                border: Border.all(color: Colors.grey.shade800),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Deliver To:', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                  const SizedBox(height: 4),
                  // Prominent Customer Name
                  Text(
                    customerName,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text('Location: ${order['location_name']}', style: const TextStyle(fontSize: 16)),
                  if (order['delivery_address_note'] != null && order['delivery_address_note'].toString().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Note: ${order['delivery_address_note']}',
                      style: const TextStyle(fontSize: 14, color: Colors.amberAccent),
                    ),
                  ],
                  if (customerPhone != null && customerPhone.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.phone, size: 18, color: Colors.grey),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            customerPhone,
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.call, size: 16, color: Colors.white),
                          label: const Text('Call', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.shade700,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => _makePhoneCall(customerPhone),
                        ),
                      ],
                    ),
                  ],
                  const Divider(height: 30),
                  Text('Payment:', style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
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
              if (widget.initialOtp != null && widget.initialOtp!.isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade950.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.amber.shade600),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'QR SECRET CODE DETECTED',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amberAccent, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        widget.initialOtp!,
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.black, color: Colors.white, letterSpacing: 8),
                      ),
                      if (widget.scannedCustomerName != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Customer: ${widget.scannedCustomerName}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white70),
                        ),
                      ]
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              const Text('4-Digit Delivery OTP:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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
                  hintText: "••••",
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
