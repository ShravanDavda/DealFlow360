import {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deactivateCustomer,
    reissueActivation
} from "../services/customerService.js";

const getCustomers = async (req, res) => {
    try {
        const customers = await getAllCustomers();

        res.status(200).json({
            success: true,
            data: customers
        });
    } catch (error) {
        console.error(
            "Get customers error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch customers"
        });
    }
};

const getCustomer = async (req, res) => {
    try {
        const customer = await getCustomerById(
            req.params.id
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        console.error(
            "Get customer error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer"
        });
    }
};

const createNewCustomer = async (req, res) => {
    try {
        const {
            customerCode,
            companyName,
            contactName,
            email,
            phone,
            password,
            customerTierId,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            postalCode,
            currency
        } = req.body;

        if (!customerCode || !companyName || !contactName || !email || !customerTierId) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer code, company name, email and customer tier are required"
            });
        }

        const customer = await createCustomer({
            customerCode,
            companyName,
            contactName,
            email,
            phone,
            password,
            customerTierId,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            postalCode,
            currency
        });

        res.status(201).json({
            success: true,
            message:
                "Customer created successfully",
            data: customer
        });
    } catch (error) {
        console.error(
            "Create customer error:",
            error
        );

        res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
    }
};

const updateExistingCustomer = async (
    req,
    res
) => {
    try {
        const customer =
            await updateCustomer(
                req.params.id,
                req.body
            );

        res.status(200).json({
            success: true,
            message:
                "Customer updated successfully",
            data: customer
        });
    } catch (error) {
        console.error(
            "Update customer error:",
            error
        );

        res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
    }
};

const deactivateExistingCustomer = async (
    req,
    res
) => {
    try {
        const customer =
            await deactivateCustomer(
                req.params.id
            );

        res.status(200).json({
            success: true,
            message:
                "Customer deactivated successfully",
            data: customer
        });
    } catch (error) {
        console.error(
            "Deactivate customer error:",
            error
        );

        res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
    }
};

const activateExistingCustomer = async (req, res) => {
    try {
        const customer = await updateCustomer(req.params.id, { isActive: true });
        res.status(200).json({ success: true, message: "Customer activated successfully", data: customer });
    } catch (error) {
        console.error("Activate customer error:", error);
        res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
};

const reissueCustomerActivation = async (req, res) => {
    try {
        const result = await reissueActivation(req.params.id);
        res.status(200).json({
            success: true,
            message: "Activation code generated successfully",
            data: result
        });
    } catch (error) {
        console.error("Reissue customer activation error:", error);
        res.status(error.statusCode || 400).json({
            success: false,
            message: error.message
        });
    }
};

export {
    getCustomers,
    getCustomer,
    createNewCustomer,
    updateExistingCustomer,
    deactivateExistingCustomer,
    activateExistingCustomer,
    reissueCustomerActivation
};