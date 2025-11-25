import * as React from "react"

import { cn } from "@/lib/utils"

interface DocumentVersion {
	documentVersionId: number,
	state: "UPLOADED" | "APPROVED" | "FINALIZED" | "REJECTED",
	createdAt: string,
	comment?: string,
	receipts: Array<Receipt>
}

interface Document {
	documentId: number,
	uploaderName: string,
	uploaderEmail: string,
	uploaderIp: string,
	uploadedAt: string,
	file: FileMetadata,
	version: DocumentVersion
}

interface Receipt {
	date: string,
	group?: string,
	number?: Number,
	bookings: Array<Booking>
}

interface Booking {
	amount: Number,
	text: string,
	debit?: Number,
	credit?: Number,
	bookingDate?: string
}

interface FileMetadata {
	filename: string,
	hash: string,
	hashAlgorithm: "SHA256"
}

interface UploadSimple {
	file : FileMetadata,
	uploaderName: string,
	uploaderEmail: string,
	metadata: SimpleMetadata
}

interface SimpleMetadata {
	receiptDate: string,
	amount: Number,
	text: string,
	comment?: string,
	debit?: Number,
	credit?: Number
}

const RequestInfo = async (path: string): Promise<T> => {
	const data = await fetch("https://localhost:7215/"+path, {"credentials": "include"})
	return data
}

const SendRequest = async (path: string, data : Object) : Promise<T> => {
	const respData = await fetch("https://localhost:7215/"+path, {"method": "POST", "body": JSON.stringify(data), "headers": {"Content-Type": "application/json"}, "credentials": "include"})
	return respData
}

export { Document, DocumentVersion, Receipt, Booking, RequestInfo, SendRequest }
