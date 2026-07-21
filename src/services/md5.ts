/**
 * MD5 hash wrapper.
 * Uses spark-md5 (3KB gzipped, fast, well-tested).
 */
import SparkMD5 from 'spark-md5'

export function md5(s: string): string {
  return SparkMD5.hash(s)
}
