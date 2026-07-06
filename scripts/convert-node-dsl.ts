import { readFileSync, writeFileSync } from 'fs'
import { convert } from '../src/utils/nodeDslToDesignDsl'

const input = JSON.parse(readFileSync('node-dsl.json', 'utf-8'))
const output = convert(input, '设置页')
writeFileSync('design-dsl.json', JSON.stringify(output, null, 2))
console.log('done')
