import { NextRequest, NextResponse } from 'next/server';

const PRODUCTS: Record<string, { id: number; name: string; price: number; category: string }> = {
  '1': { id: 1, name: 'Widget Pro',    price: 29.99, category: 'tools' },
  '2': { id: 2, name: 'Gadget Plus',   price: 59.99, category: 'electronics' },
  '3': { id: 3, name: 'Sensor Shield', price: 14.99, category: 'components' },
};

const SQL_PATTERNS = ["'", '"', '--', ';', ' OR ', ' AND ', 'UNION', 'SELECT', 'DROP', 'INSERT', '1=1', '1 =1'];

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '1';

  // ⚠️ VULNERABILITY: Input not validated before being interpolated into a simulated SQL query
  const upper = id.toUpperCase();
  const isInjection = SQL_PATTERNS.some(p => upper.includes(p.toUpperCase()));

  if (isInjection) {
    // Simulate a real SQL error response (like an unparameterized MySQL query would produce)
    return NextResponse.json(
      {
        error: `You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${id}' at line 1`,
        query: `SELECT * FROM products WHERE id = ${id}`,
        errno: 1064,
        sqlState: '42000',
      },
      { status: 500 },
    );
  }

  const product = PRODUCTS[id];
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  return NextResponse.json(product);
}
