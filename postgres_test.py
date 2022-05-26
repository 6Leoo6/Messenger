import psycopg2
from psycopg2 import pool

con = pool.SimpleConnectionPool(1, 20, host="localhost", database="users", user="postgres", password="postgres")
cur = con.cursor()
con.close()