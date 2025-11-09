"use client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useToast } from "../../../components/ToastProvider";

function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const router = useRouter();
  const toast = useToast();

  const onSubmit = handleSubmit(async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.warn("La contraseña no coincide");
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: data.username,
        email: data.email,
        phone: data.phone,
        password: data.password
      }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      toast.success("Usuario creado con éxito");
      router.push('/auth/login');
    } else {
      const errorData = await res.json().catch(() => ({}));
      // show more details in dev so user can see the real server message
      const message = errorData?.details || errorData?.message || errorData?.error || "El usuario ya existe";
      toast.error(String(message));
    }
  });

  // Función para redirigir al Home
  const handleHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 btn-secondary px-3 py-1 text-xs"
        aria-label="Ir al Home"
        title="Ir al Home"
      >
        <span role="img" aria-hidden="true">🏠</span> Home
      </button>

      <form onSubmit={onSubmit} className="card w-full max-w-sm p-6">
        <h1 className="text-slate-900 font-bold text-2xl mb-4 text-center">Registro</h1>

        <label className="text-slate-600 mb-1 block text-xs">Nombre de usuario</label>
        <input
          type="text"
          {...register("username", { required: { value: true, message: "Nombre de usuario requerido" } })}
          className="input-base w-full mb-2"
          placeholder="nombre de usuario"
        />
  {errors.username && <span className="text-slate-700 text-xs">{errors.username.message}</span>}

        <label className="text-slate-600 mb-1 block text-xs">E-mail</label>
        <input
          type="email"
          {...register("email", { required: { value: true, message: "E-mail requerido" } })}
          className="input-base w-full mb-2"
          placeholder="email@gmail.com"
        />
  {errors.email && <span className="text-slate-700 text-xs">{errors.email.message}</span>}

        <label className="text-slate-600 mb-1 block text-xs">Celular</label>
        <input
          type="tel"
          {...register("phone")}
          className="input-base w-full mb-2"
          placeholder="+57 300 0000000"
        />
  {errors.phone && <span className="text-slate-700 text-xs">{errors.phone.message}</span>}

        <label className="text-slate-600 mb-1 block text-xs">Contraseña</label>
        <input
          type="password"
          {...register("password", { required: { value: true, message: "Contraseña requerida" } })}
          className="input-base w-full mb-2"
          placeholder="*******"
        />
  {errors.password && <span className="text-slate-700 text-xs">{errors.password.message}</span>}

        <label className="text-slate-600 mb-1 block text-xs">Confirmar contraseña</label>
        <input
          type="password"
          {...register("confirmPassword", { required: { value: true, message: "Confirmación requerida" } })}
          className="input-base w-full mb-3"
          placeholder="*******"
        />
  {errors.confirmPassword && <span className="text-slate-700 text-xs">{errors.confirmPassword.message}</span>}

        <button className="btn-primary w-full mt-3">Registrarse</button>
      </form>
    </div>
  );
}

export default RegisterPage;
