import sqlite3
import random

def run_migration():
    conn = sqlite3.connect('aicte_monitor.db')
    cursor = conn.cursor()

    # Check existing columns in complaints
    cursor.execute('PRAGMA table_info(complaints)')
    cols = [row[1] for row in cursor.fetchall()]
    print('Existing columns:', cols)

    if 'apaar_id' not in cols:
        print('Adding apaar_id column...')
        cursor.execute('ALTER TABLE complaints ADD COLUMN apaar_id VARCHAR(50)')

    if 'is_apaar_verified' not in cols:
        print('Adding is_apaar_verified column...')
        cursor.execute('ALTER TABLE complaints ADD COLUMN is_apaar_verified BOOLEAN DEFAULT 0')

    conn.commit()

    # Populate synthetic APAAR IDs for demonstration
    cursor.execute('SELECT id, is_anonymous FROM complaints')
    rows = cursor.fetchall()
    updated = 0
    for cid, is_anon in rows:
        if not is_anon and random.random() < 0.65:
            p1 = random.randint(2024, 2026)
            p2 = random.randint(1000, 9999)
            p3 = random.randint(1000, 9999)
            apaar = f"{p1}-{p2}-{p3}"
            cursor.execute('UPDATE complaints SET apaar_id = ?, is_apaar_verified = 1 WHERE id = ?', (apaar, cid))
            updated += 1
        else:
            cursor.execute('UPDATE complaints SET apaar_id = NULL, is_apaar_verified = 0 WHERE id = ?', (cid,))

    conn.commit()
    print(f"Migration successful! Seeded {updated} complaints with verified APAAR IDs out of {len(rows)} total complaints.")
    conn.close()

if __name__ == '__main__':
    run_migration()
